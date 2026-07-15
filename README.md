# City Ops — Incident Triage Dashboard

A desktop-first geospatial dashboard for city operations teams to monitor, triage, and review civic incident reports. Built as a portfolio project demonstrating full-stack data engineering, explainable AI pipelines, and real-time-style operational UX.

---

## What It Does

City operators receive hundreds of incident reports daily — potholes, flooding, downed trees, power outages — from multiple sources. This dashboard ingests those reports, scores them by severity, clusters nearby duplicates, and surfaces the highest-priority items for human review. All AI outputs are explicitly labeled as advisory and require operator verification before dispatch.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Python Pipeline (offline)              │
│                                                         │
│  generate_synthetic_reports.py                          │
│    └─ 600 incidents · severity scoring · AI summaries   │
│         │                                               │
│  cluster_incidents.py                                   │
│    └─ Union-Find · 500m + 48h · same type               │
│         │                                               │
│  classify_incidents.py  (library + CLI)                 │
│    └─ keyword rules · score breakdown · confidence       │
│         │                                               │
│  upload_to_supabase.py                                  │
│    └─ validates · sanitizes · batch inserts             │
└────────────────┬────────────────────────────────────────┘
                 │  service-role key (write only)
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + PostGIS)             │
│                                                         │
│  incidents · incident_clusters · incident_cluster_members│
│  status_events · media_evidence · data_sources          │
│                                                         │
│  Row Level Security: anon = read · service_role = write  │
└────────────────┬────────────────────────────────────────┘
                 │  anon key (read only)
                 ▼
┌─────────────────────────────────────────────────────────┐
│               React + Vite Frontend                      │
│                                                         │
│  useIncidents / useClusters / useIncidentDetail hooks    │
│  IncidentMap (Leaflet) · IncidentFilters · TriageQueue   │
│  IncidentDetailPanel · ClusterDetailPanel                │
│  Score bar · Confidence meter · Status workflow          │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 (dark theme) |
| Maps | Leaflet + react-leaflet v4 |
| Database | Supabase (PostgreSQL + PostGIS) |
| Auth | None (demo mode — `demo_operator`) |
| Pipeline | Python 3.11 · pure stdlib + supabase-py |
| Tests | Vitest (frontend) · pytest (pipeline) |
| Deploy | Vercel |

---

## Features

- **Geospatial map** — 600 color-coded incident markers (red/amber/green by priority); zoom-adaptive cluster view
- **Filters** — live filter by type, priority, status, and source; updates map + list instantly
- **Triage queue** — banner surfaces unreviewed high-priority incidents; "Review next →" jump
- **Detail panel** — full incident view with visual severity bar, confidence meter, AI advisory, and "why this priority?" explanation
- **Status workflow** — operators advance incidents through `new → under_review → verified → resolved`; every change logged to `status_events`
- **Cluster view** — Python script groups nearby same-type incidents; cluster markers show member count; clicking opens member list
- **Explainable AI** — score breakdown (base + weather/transit/location weights); all AI output explicitly labeled `[Advisory — AI-generated]`

---

## Local Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- A free [Supabase](https://supabase.com) project

### 1. Install frontend dependencies

```bash
cd src/tbd-city-ops
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# Found in: Supabase Dashboard → Project Settings → API
```

### 3. Apply database schema

In **Supabase Dashboard → SQL Editor**, run these files in order:

```
supabase/schema.sql
supabase/migrations/001_grants_and_rls.sql
supabase/migrations/002_anon_write_status.sql
supabase/migrations/003_cluster_latlon.sql
```

### 4. Run the data pipeline

```bash
cd src/tbd-city-ops/pipeline
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
# Found in: Supabase Dashboard → Project Settings → API → service_role

pip install -r requirements.txt
python scripts/generate_synthetic_reports.py   # generates 600 incidents
python scripts/upload_to_supabase.py           # uploads to database
python scripts/cluster_incidents.py            # groups nearby duplicates
```

### 5. Start the dev server

```bash
cd src/tbd-city-ops
npm run dev
# Open http://localhost:5173
```

---

## Pipeline Scripts

| Script | Purpose |
|---|---|
| `generate_synthetic_reports.py` | Generates 600 synthetic civic incidents with severity scoring, AI summaries, and geographic spread around Chicago |
| `upload_to_supabase.py` | Validates, sanitizes, and batch-uploads incidents (50/batch) using the service-role key |
| `cluster_incidents.py` | Groups incidents within 500m + 48h + same type using Union-Find; stores clusters in Supabase |
| `classify_incidents.py` | Keyword-based type classifier + scoring formula; importable library + CLI demo |

### CLI demo

```bash
cd src/tbd-city-ops/pipeline
python scripts/classify_incidents.py --text "water gushing from the ground near Oak St"
python scripts/classify_incidents.py --text "pothole on Clark causing vehicle damage" --weather --critical
```

---

## Running Tests

```bash
# Pipeline tests (21 tests)
cd src/tbd-city-ops/pipeline
pytest tests/ -v

# Frontend tests
cd src/tbd-city-ops
npx vitest run
```

---

## Safety & Privacy

- **No real PII** — all incident data is synthetic and randomly generated
- **No real locations** — coordinates are randomly spread around a public city center point
- **AI outputs are advisory** — every AI-generated field is labeled `[Advisory — AI-generated]` and requires human operator verification before any dispatch action
- **Service-role key never exposed** — the write key is used only in the offline Python pipeline; the frontend uses a read-only anon key
- **RLS enforced** — Supabase Row Level Security restricts the anon role to SELECT only; write operations require the service-role key

---

## Project Structure

```
tbd-city-ops/
├── src/
│   ├── components/
│   │   ├── map/          # IncidentMap, ClusterMarker
│   │   ├── incidents/    # IncidentFilters, IncidentList, IncidentDetailPanel,
│   │   │                 # ClusterDetailPanel, TriageQueue
│   │   └── layout/       # DashboardLayout
│   ├── hooks/            # useIncidents, useClusters, useIncidentDetail
│   ├── lib/              # supabaseClient, incidentQueries
│   └── pages/            # Dashboard
├── pipeline/
│   ├── scripts/          # generate, upload, cluster, classify
│   └── tests/            # pytest suite
└── supabase/
    ├── schema.sql
    └── migrations/
```
