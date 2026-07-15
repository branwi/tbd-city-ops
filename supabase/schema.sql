-- ============================================================
-- City Ops Incident Dashboard — Initial Schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable PostGIS extension (required for geography columns)
CREATE EXTENSION IF NOT EXISTS postgis;


-- ============================================================
-- 1. incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type       TEXT NOT NULL,
  source_id         TEXT,
  incident_type     TEXT NOT NULL,
  title             TEXT,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'new',
  severity_score    NUMERIC DEFAULT 0,
  priority_label    TEXT DEFAULT 'low',
  confidence_score  NUMERIC DEFAULT 0,
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  location          GEOGRAPHY(POINT, 4326),
  address           TEXT,
  ai_summary        TEXT,
  priority_reason   TEXT,
  reported_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS incidents_location_idx    ON incidents USING GIST(location);
CREATE INDEX IF NOT EXISTS incidents_type_idx        ON incidents(incident_type);
CREATE INDEX IF NOT EXISTS incidents_status_idx      ON incidents(status);
CREATE INDEX IF NOT EXISTS incidents_priority_idx    ON incidents(priority_label);
CREATE INDEX IF NOT EXISTS incidents_reported_at_idx ON incidents(reported_at DESC);
CREATE INDEX IF NOT EXISTS incidents_severity_idx    ON incidents(severity_score DESC);


-- ============================================================
-- 2. incident_clusters
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_clusters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_type    TEXT,
  centroid        GEOGRAPHY(POINT, 4326),
  incident_count  INTEGER DEFAULT 0,
  severity_score  NUMERIC DEFAULT 0,
  priority_label  TEXT DEFAULT 'low',
  summary         TEXT,
  status          TEXT DEFAULT 'new',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clusters_centroid_idx ON incident_clusters USING GIST(centroid);
CREATE INDEX IF NOT EXISTS clusters_priority_idx ON incident_clusters(priority_label);


-- ============================================================
-- 3. incident_cluster_members
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_cluster_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id  UUID REFERENCES incident_clusters(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cluster_members_cluster_idx  ON incident_cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS cluster_members_incident_idx ON incident_cluster_members(incident_id);


-- ============================================================
-- 4. media_evidence
-- ============================================================
CREATE TABLE IF NOT EXISTS media_evidence (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id    UUID REFERENCES incidents(id) ON DELETE CASCADE,
  media_type     TEXT NOT NULL,
  storage_path   TEXT,
  source_url     TEXT,
  caption        TEXT,
  ai_description TEXT,
  contains_pii   BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_incident_idx ON media_evidence(incident_id);


-- ============================================================
-- 5. data_sources
-- ============================================================
CREATE TABLE IF NOT EXISTS data_sources (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  source_type      TEXT NOT NULL,
  status           TEXT DEFAULT 'active',
  last_imported_at TIMESTAMPTZ,
  record_count     INTEGER DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the four demo source types
INSERT INTO data_sources (name, source_type, status, notes) VALUES
  ('311 Civic Reports',      'civic_report',    'active', 'Public 311 service requests and citizen complaints'),
  ('Weather Alerts',         'weather_alert',   'active', 'NWS weather alerts and advisories'),
  ('Transit Disruptions',    'transit_alert',   'active', 'Bus and rail service disruptions'),
  ('Citizen Media Reports',  'citizen_report',  'active', 'Simulated citizen-submitted text and media')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 6. status_events  (audit log of operator actions)
-- ============================================================
CREATE TABLE IF NOT EXISTS status_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID REFERENCES incidents(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status      TEXT,
  action_note     TEXT,
  actor_name      TEXT DEFAULT 'demo_operator',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS status_events_incident_idx ON status_events(incident_id);
CREATE INDEX IF NOT EXISTS status_events_created_idx  ON status_events(created_at DESC);


-- ============================================================
-- Helper: auto-update updated_at on incidents
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER clusters_updated_at
  BEFORE UPDATE ON incident_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
