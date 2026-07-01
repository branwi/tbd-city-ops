"""
upload_to_supabase.py
Reads pipeline/data/sample/incidents.json and bulk-uploads to Supabase.
Uses the service-role key (write access) — never use in frontend code.

Usage:
    cd pipeline
    python scripts/upload_to_supabase.py

Requires pipeline/.env with:
    SUPABASE_URL=https://your-project.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
"""

import json
import os
import sys
from pathlib import Path

# Load .env from pipeline/.env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    print("Warning: python-dotenv not installed. Reading env vars directly.")

try:
    from supabase import create_client
except ImportError:
    print("Error: supabase package not installed. Run: pip install -r requirements.txt")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
BATCH_SIZE = 50  # Supabase handles up to 1000, but 50 keeps errors manageable

REQUIRED_FIELDS = ["incident_type", "latitude", "longitude", "source_type"]

# Fields to include in the upload (matches schema columns)
UPLOAD_FIELDS = [
    "id", "source_type", "source_id", "incident_type", "title", "description",
    "status", "severity_score", "priority_label", "confidence_score",
    "latitude", "longitude", "address", "ai_summary", "priority_reason", "reported_at",
]


def validate_record(record: dict) -> tuple[bool, str]:
    for field in REQUIRED_FIELDS:
        if record.get(field) is None:
            return False, f"Missing required field: {field}"
    if not (-90 <= record["latitude"] <= 90):
        return False, f"Invalid latitude: {record['latitude']}"
    if not (-180 <= record["longitude"] <= 180):
        return False, f"Invalid longitude: {record['longitude']}"
    return True, ""


def sanitize_record(record: dict) -> dict:
    """Keep only schema columns and add the PostGIS location string."""
    cleaned = {k: record[k] for k in UPLOAD_FIELDS if k in record}
    # PostGIS geography point — Supabase accepts WKT string
    cleaned["location"] = f"POINT({record['longitude']} {record['latitude']})"
    return cleaned


def upload_in_batches(client, records: list[dict]) -> tuple[int, int]:
    uploaded = 0
    failed = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        try:
            response = client.table("incidents").insert(batch).execute()
            uploaded += len(batch)
            print(f"  Uploaded batch {i // BATCH_SIZE + 1}: {len(batch)} records "
                  f"(total {uploaded}/{len(records)})")
        except Exception as e:
            failed += len(batch)
            print(f"  ✗ Batch {i // BATCH_SIZE + 1} failed: {e}")

    return uploaded, failed


def main():
    # ── Validate credentials ──────────────────────────────────────────────────
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(
            "Error: Missing credentials.\n"
            "Create pipeline/.env with:\n"
            "  SUPABASE_URL=https://your-project.supabase.co\n"
            "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n"
            "Found in: Supabase Dashboard → Project Settings → API → service_role"
        )
        sys.exit(1)

    # ── Load data ─────────────────────────────────────────────────────────────
    data_path = Path(__file__).parent.parent / "data" / "sample" / "incidents.json"
    if not data_path.exists():
        print(f"Error: {data_path} not found.\nRun generate_synthetic_reports.py first.")
        sys.exit(1)

    with open(data_path) as f:
        raw_records = json.load(f)
    print(f"Loaded {len(raw_records)} records from {data_path}")

    # ── Validate ──────────────────────────────────────────────────────────────
    valid_records = []
    skipped = 0
    for record in raw_records:
        ok, reason = validate_record(record)
        if ok:
            valid_records.append(sanitize_record(record))
        else:
            skipped += 1
            print(f"  Skipping record {record.get('id', '?')}: {reason}")

    print(f"Valid: {len(valid_records)}  |  Skipped: {skipped}")

    if not valid_records:
        print("No valid records to upload. Exiting.")
        sys.exit(1)

    # ── Connect to Supabase ───────────────────────────────────────────────────
    print(f"\nConnecting to {SUPABASE_URL}...")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ── Upload ────────────────────────────────────────────────────────────────
    print(f"\nUploading {len(valid_records)} records in batches of {BATCH_SIZE}...")
    uploaded, failed = upload_in_batches(client, valid_records)

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'─' * 40}")
    print(f"✓ Upload complete")
    print(f"  Uploaded : {uploaded}")
    print(f"  Failed   : {failed}")
    print(f"  Skipped  : {skipped}")
    print(f"{'─' * 40}")

    if failed == 0:
        print("\nAll records uploaded successfully.")
        print("Open your dashboard — you should now see the incident count.")
    else:
        print(f"\n{failed} batches failed. Check your schema and RLS policies.")
        sys.exit(1)


if __name__ == "__main__":
    main()
