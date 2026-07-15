-- ============================================================
-- Migration 001: Table Grants + RLS Policies
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
-- schema.sql creates the tables but does not grant access.
-- This file adds:
--   • GRANT table-level privileges so service_role can INSERT
--   • RLS SELECT policies so the anon frontend key can read
-- ============================================================


-- ── 1. GRANT table-level privileges ──────────────────────────────────────────
-- service_role needs explicit GRANT even though it bypasses RLS row-checks.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON incidents, incident_clusters, incident_cluster_members,
     media_evidence, data_sources, status_events
  TO service_role;

-- anon key (frontend): read-only across all tables
GRANT SELECT
  ON incidents, incident_clusters, incident_cluster_members,
     media_evidence, data_sources, status_events
  TO anon;

-- authenticated role: read-only for now (Phase 4 will expand this)
GRANT SELECT
  ON incidents, incident_clusters, data_sources, status_events
  TO authenticated;


-- ── 2. Enable RLS (idempotent — safe to re-run) ───────────────────────────────
ALTER TABLE incidents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_clusters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_evidence           ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources             ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_events            ENABLE ROW LEVEL SECURITY;


-- ── 3. RLS policies: anon can read everything (portfolio demo — no real PII) ──
CREATE POLICY "anon_read_incidents"
  ON incidents
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_read_clusters"
  ON incident_clusters
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_read_cluster_members"
  ON incident_cluster_members
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_read_media_evidence"
  ON media_evidence
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_read_data_sources"
  ON data_sources
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_read_status_events"
  ON status_events
  FOR SELECT TO anon
  USING (true);


-- ── 4. RLS policies: service_role can read + write everything ─────────────────
-- (service_role bypasses RLS by default in Supabase, but explicit policies
--  ensure it still works if that default is ever changed.)
CREATE POLICY "service_role_all_incidents"
  ON incidents
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_clusters"
  ON incident_clusters
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_cluster_members"
  ON incident_cluster_members
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_media_evidence"
  ON media_evidence
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_data_sources"
  ON data_sources
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_status_events"
  ON status_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
