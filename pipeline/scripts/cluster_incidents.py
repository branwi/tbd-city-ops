"""
cluster_incidents.py
Groups nearby same-type incidents into clusters using a distance + time heuristic.
Runs offline — no AI APIs called.

Clustering rules:
  • Same incident_type
  • Distance < 500 metres (Haversine)
  • Reported within 48 hours of each other
  • Minimum 2 incidents to form a cluster

Idempotent: clears all existing clusters before each run.

Usage:
    cd pipeline
    python scripts/cluster_incidents.py
"""

import math
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

try:
    from supabase import create_client
except ImportError:
    print("Error: supabase not installed. Run: pip install -r requirements.txt")
    sys.exit(1)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

DISTANCE_THRESHOLD_M = 500
TIME_THRESHOLD_H     = 48
MIN_CLUSTER_SIZE     = 2


# ── Geometry ──────────────────────────────────────────────────────────────────

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def parse_dt(s):
    if not s:
        return datetime.now(timezone.utc)
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


# ── Union-Find (connected components) ────────────────────────────────────────

class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank   = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1


# ── Clustering ────────────────────────────────────────────────────────────────

def find_clusters(incidents):
    """Return list of index-lists; each inner list is one cluster (size >= MIN)."""
    n = len(incidents)
    uf = UnionFind(n)

    for i in range(n):
        for j in range(i + 1, n):
            a, b = incidents[i], incidents[j]
            if haversine_m(a["latitude"], a["longitude"],
                           b["latitude"], b["longitude"]) > DISTANCE_THRESHOLD_M:
                continue
            dt_a = parse_dt(a["reported_at"])
            dt_b = parse_dt(b["reported_at"])
            if abs((dt_a - dt_b).total_seconds()) / 3600 > TIME_THRESHOLD_H:
                continue
            uf.union(i, j)

    groups = {}
    for i in range(n):
        groups.setdefault(uf.find(i), []).append(i)

    return [idxs for idxs in groups.values() if len(idxs) >= MIN_CLUSTER_SIZE]


def get_priority(score):
    if score >= 66: return "high"
    if score >= 31: return "medium"
    return "low"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(
            "Error: Missing credentials.\n"
            "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to pipeline/.env"
        )
        sys.exit(1)

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Fetch incidents
    print("Fetching incidents…")
    res = client.table("incidents").select(
        "id, incident_type, latitude, longitude, reported_at, severity_score"
    ).execute()
    incidents = res.data or []
    print(f"  Loaded {len(incidents)} incidents")

    if not incidents:
        print("No incidents found. Run upload_to_supabase.py first.")
        sys.exit(1)

    # Clear existing clusters (cascade deletes cluster_members)
    print("Clearing existing clusters…")
    client.table("incident_clusters") \
          .delete() \
          .neq("id", "00000000-0000-0000-0000-000000000000") \
          .execute()

    # Group by type, then cluster within each type
    by_type = {}
    for inc in incidents:
        by_type.setdefault(inc["incident_type"], []).append(inc)

    built_clusters = []
    total_clustered = 0

    for inc_type, group in by_type.items():
        for idxs in find_clusters(group):
            members   = [group[i] for i in idxs]
            c_lat     = sum(m["latitude"]  for m in members) / len(members)
            c_lon     = sum(m["longitude"] for m in members) / len(members)
            max_score = max(m["severity_score"] or 0 for m in members)

            built_clusters.append({
                "cluster_type":   inc_type,
                "centroid_lat":   round(c_lat, 6),
                "centroid_lon":   round(c_lon, 6),
                "centroid":       f"POINT({c_lon} {c_lat})",
                "incident_count": len(members),
                "severity_score": round(max_score, 1),
                "priority_label": get_priority(max_score),
                "summary": (
                    f"{len(members)} {inc_type.replace('_', ' ')} incidents within ~500m"
                ),
                "_member_ids": [m["id"] for m in members],
            })
            total_clustered += len(members)

    print(f"\nFormed {len(built_clusters)} clusters covering {total_clustered} incidents")

    if not built_clusters:
        print("No clusters formed — incidents may be too spread out.")
        return

    # Insert clusters + members
    print("Inserting clusters…")
    inserted = 0
    for cluster in built_clusters:
        member_ids = cluster.pop("_member_ids")
        res = client.table("incident_clusters").insert(cluster).execute()
        cluster_id = res.data[0]["id"]
        client.table("incident_cluster_members").insert([
            {"cluster_id": cluster_id, "incident_id": iid}
            for iid in member_ids
        ]).execute()
        inserted += 1

    # Summary
    by_type_count = Counter(c["cluster_type"] for c in built_clusters)
    print(f"\n{'─' * 42}")
    print(f"✓ Clustering complete")
    print(f"  Clusters : {inserted}")
    print(f"  Grouped  : {total_clustered} / {len(incidents)} incidents")
    print(f"\nBy type:")
    for t, n in sorted(by_type_count.items(), key=lambda x: -x[1]):
        print(f"  {t:<25} {n} clusters")
    print(f"{'─' * 42}")


if __name__ == "__main__":
    main()
