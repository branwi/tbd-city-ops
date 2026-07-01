"""
generate_synthetic_reports.py
Generates 600 realistic synthetic city incident records and saves to
pipeline/data/sample/incidents.json

Usage:
    python pipeline/scripts/generate_synthetic_reports.py

Output:
    pipeline/data/sample/incidents.json
"""

import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Configuration ────────────────────────────────────────────────────────────
# City center + spread radius (degrees). Default: Chicago downtown.
# Change CITY_LAT / CITY_LON to your preferred city.
CITY_LAT = 41.8781
CITY_LON = -87.6298
SPREAD_LAT = 0.12   # ~13 km north/south
SPREAD_LON = 0.18   # ~15 km east/west

TOTAL_INCIDENTS = 600
SEED = 42           # fix seed for reproducible demo data

# ── Incident type definitions ─────────────────────────────────────────────────
INCIDENT_TYPES = {
    "flooding":              {"base_score": 55, "source_types": ["civic_report", "weather_alert"]},
    "pothole":               {"base_score": 20, "source_types": ["civic_report", "citizen_report"]},
    "fallen_tree":           {"base_score": 35, "source_types": ["civic_report", "citizen_report"]},
    "power_outage":          {"base_score": 60, "source_types": ["civic_report", "weather_alert"]},
    "road_damage":           {"base_score": 30, "source_types": ["civic_report", "citizen_report"]},
    "graffiti":              {"base_score": 10, "source_types": ["civic_report", "citizen_report"]},
    "noise_complaint":       {"base_score": 12, "source_types": ["citizen_report"]},
    "water_main_break":      {"base_score": 58, "source_types": ["civic_report"]},
    "traffic_signal_issue":  {"base_score": 45, "source_types": ["civic_report", "transit_alert"]},
    "debris_on_road":        {"base_score": 28, "source_types": ["civic_report", "citizen_report"]},
}

INCIDENT_TYPE_WEIGHTS = [
    ("pothole", 0.20),
    ("debris_on_road", 0.14),
    ("road_damage", 0.12),
    ("graffiti", 0.10),
    ("noise_complaint", 0.10),
    ("fallen_tree", 0.10),
    ("traffic_signal_issue", 0.09),
    ("flooding", 0.07),
    ("power_outage", 0.05),
    ("water_main_break", 0.03),
]

STATUSES = ["new", "new", "new", "under_review", "verified", "resolved", "dismissed"]

TITLE_TEMPLATES = {
    "flooding":             ["Street flooding reported", "Standing water blocking road", "Flooded underpass", "Stormwater overflow"],
    "pothole":              ["Large pothole", "Road surface damage", "Pothole causing traffic hazard", "Multiple potholes"],
    "fallen_tree":          ["Tree down blocking road", "Fallen tree on sidewalk", "Storm-damaged tree", "Uprooted tree"],
    "power_outage":         ["Power outage reported", "Street lights out", "Electrical lines down", "Transformer issue"],
    "road_damage":          ["Road surface deteriorating", "Cracked pavement", "Sinkhole forming", "Road collapse"],
    "graffiti":             ["Graffiti on underpass", "Vandalism reported", "Graffiti on public building", "Tagged infrastructure"],
    "noise_complaint":      ["Excessive noise complaint", "Late-night construction noise", "Loud gathering reported", "Industrial noise"],
    "water_main_break":     ["Water main break", "Water gushing from ground", "Major water leak", "Burst pipe"],
    "traffic_signal_issue": ["Traffic signal malfunction", "Signal stuck on red", "Traffic light out", "Crossing signal broken"],
    "debris_on_road":       ["Debris blocking lane", "Construction material on road", "Trash pile in street", "Scattered debris"],
}

DESCRIPTION_TEMPLATES = {
    "flooding":             "Water level approximately {depth} inches deep. Vehicles unable to pass. Area has been flooding recurrently during heavy rain.",
    "pothole":              "Pothole approximately {size} inches wide and {depth} inches deep in the {lane} lane. Causing vehicle damage.",
    "fallen_tree":          "Tree has fallen across {coverage} of the roadway. Root system appears compromised. No injuries reported.",
    "power_outage":         "Approximately {count} residences affected. Outage began around {time}. Cause unknown.",
    "road_damage":          "Pavement shows significant cracking and displacement over approximately {size} sq ft. Safety hazard for cyclists.",
    "graffiti":             "Graffiti covering approximately {size} sq ft on {surface}. Content is {content}.",
    "noise_complaint":      "Noise levels exceeding acceptable limits. Occurring primarily between {time1} and {time2}.",
    "water_main_break":     "Estimated flow rate significant. Water reaching {coverage} of the street width. Pavement undermining likely.",
    "traffic_signal_issue": "Signal has been malfunctioning for approximately {duration}. Near-miss incidents reported by drivers.",
    "debris_on_road":       "Debris field spanning approximately {size} ft. Origin appears to be {origin}. Lane blockage confirmed.",
}

def fill_description(incident_type):
    template = DESCRIPTION_TEMPLATES[incident_type]
    replacements = {
        "{depth}":    str(random.randint(2, 18)),
        "{size}":     str(random.randint(6, 48)),
        "{lane}":     random.choice(["northbound", "southbound", "center", "right"]),
        "{coverage}": random.choice(["half", "two-thirds", "the full width of"]),
        "{count}":    str(random.randint(10, 400)),
        "{time}":     f"{random.randint(0,23):02d}:{random.randint(0,59):02d}",
        "{time1}":    f"{random.randint(22,23):02d}:00",
        "{time2}":    f"0{random.randint(2,4)}:00",
        "{surface}":  random.choice(["concrete wall", "transit shelter", "bridge abutment", "utility box"]),
        "{content}":  random.choice(["non-offensive", "offensive", "gang-related symbols"]),
        "{origin}":   random.choice(["nearby construction", "an overturned vehicle", "storm activity", "illegal dumping"]),
        "{duration}": random.choice(["2 hours", "4 hours", "overnight", "the past 30 minutes"]),
    }
    for key, val in replacements.items():
        template = template.replace(key, val)
    return template


def calculate_severity(incident_type, has_weather, has_transit, is_critical):
    base = INCIDENT_TYPES[incident_type]["base_score"]
    report_weight = random.randint(0, 20)
    weather_weight = 10 if has_weather else 0
    transit_weight = 10 if has_transit else 0
    location_weight = 15 if is_critical else 0
    score = base + report_weight + weather_weight + transit_weight + location_weight
    return min(round(score + random.uniform(-5, 5), 1), 100.0)


def get_priority_label(score):
    if score >= 66:
        return "high"
    if score >= 31:
        return "medium"
    return "low"


def generate_priority_reason(incident_type, score, has_weather, is_critical):
    reasons = []
    base = INCIDENT_TYPES[incident_type]["base_score"]
    reasons.append(f"Base score for {incident_type.replace('_', ' ')}: {base}")
    if has_weather:
        reasons.append("weather context adds risk (+10)")
    if is_critical:
        reasons.append("near critical infrastructure (+15)")
    if score >= 66:
        reasons.append("classified HIGH — immediate attention recommended")
    elif score >= 31:
        reasons.append("classified MEDIUM — review within 24 hours")
    else:
        reasons.append("classified LOW — routine queue")
    return ". ".join(reasons) + "."


def generate_ai_summary(incident_type, title, severity_score, priority_label):
    return (
        f"[Advisory — AI-generated] {title}. "
        f"Incident type: {incident_type.replace('_', ' ')}. "
        f"Severity score: {severity_score}/100 ({priority_label} priority). "
        f"Human verification required before dispatch."
    )


def random_latlon():
    lat = CITY_LAT + random.uniform(-SPREAD_LAT, SPREAD_LAT)
    lon = CITY_LON + random.uniform(-SPREAD_LON, SPREAD_LON)
    return round(lat, 6), round(lon, 6)


def random_reported_at():
    days_ago = random.uniform(0, 7)
    dt = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return dt.isoformat()


def pick_weighted(weighted_list):
    types, weights = zip(*weighted_list)
    return random.choices(types, weights=weights, k=1)[0]


def generate_incidents(n=TOTAL_INCIDENTS):
    random.seed(SEED)
    incidents = []

    for _ in range(n):
        incident_type = pick_weighted(INCIDENT_TYPE_WEIGHTS)
        cfg = INCIDENT_TYPES[incident_type]

        has_weather = random.random() < 0.2
        has_transit = random.random() < 0.15
        is_critical = random.random() < 0.12

        severity_score = calculate_severity(incident_type, has_weather, has_transit, is_critical)
        priority_label = get_priority_label(severity_score)
        confidence_score = round(random.uniform(0.55, 0.97), 2)

        lat, lon = random_latlon()
        title = random.choice(TITLE_TEMPLATES[incident_type])
        source_type = random.choice(cfg["source_types"])

        incident = {
            "id":               str(uuid.uuid4()),
            "source_type":      source_type,
            "source_id":        f"{source_type[:3].upper()}-{random.randint(10000, 99999)}",
            "incident_type":    incident_type,
            "title":            title,
            "description":      fill_description(incident_type),
            "status":           random.choice(STATUSES),
            "severity_score":   severity_score,
            "priority_label":   priority_label,
            "confidence_score": confidence_score,
            "latitude":         lat,
            "longitude":        lon,
            "address":          f"{random.randint(100, 9999)} {random.choice(['Main', 'Oak', 'Lake', 'Park', 'Division', 'Milwaukee', 'Halsted', 'Clark', 'State', 'Wabash'])} {random.choice(['St', 'Ave', 'Blvd', 'Rd'])}",
            "ai_summary":       generate_ai_summary(incident_type, title, severity_score, priority_label),
            "priority_reason":  generate_priority_reason(incident_type, severity_score, has_weather, is_critical),
            "reported_at":      random_reported_at(),
        }
        incidents.append(incident)

    return incidents


def main():
    output_dir = Path(__file__).parent.parent / "data" / "sample"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "incidents.json"

    print(f"Generating {TOTAL_INCIDENTS} synthetic incidents...")
    incidents = generate_incidents(TOTAL_INCIDENTS)

    with open(output_path, "w") as f:
        json.dump(incidents, f, indent=2)

    # Summary
    from collections import Counter
    types = Counter(i["incident_type"] for i in incidents)
    priorities = Counter(i["priority_label"] for i in incidents)

    print(f"\n✓ Saved {len(incidents)} incidents to {output_path}")
    print("\nBy type:")
    for t, count in sorted(types.items(), key=lambda x: -x[1]):
        print(f"  {t:<25} {count}")
    print("\nBy priority:")
    for p in ["high", "medium", "low"]:
        print(f"  {p:<10} {priorities[p]}")


if __name__ == "__main__":
    main()
