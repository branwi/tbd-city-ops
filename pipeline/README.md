# Data Pipeline

Python scripts for generating, classifying, and uploading incident data to Supabase.

## Setup

```bash
cd pipeline
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

## Structure

```
pipeline/
├── data/
│   ├── raw/          # Source data — read-only, never commit
│   ├── processed/    # Cleaned/normalized output
│   └── sample/       # Synthetic sample data for demos
├── scripts/
│   ├── generate_synthetic_reports.py   # Phase 2
│   ├── classify_incidents.py           # Phase 6
│   ├── cluster_incidents.py            # Phase 5
│   └── upload_to_supabase.py          # Phase 2
├── tests/
│   └── test_scoring.py                 # Phase 6
├── notebooks/
│   └── exploration.ipynb              # Scratch analysis
├── requirements.txt
└── README.md
```

## Scripts (added per phase)

| Script | Phase | Purpose |
|--------|-------|---------|
| `generate_synthetic_reports.py` | 2 | Create 500+ demo incidents |
| `upload_to_supabase.py` | 2 | Bulk upload to Supabase |
| `cluster_incidents.py` | 5 | Group nearby duplicate reports |
| `classify_incidents.py` | 6 | Rule-based type + severity scoring |
