-- ============================================================
-- Migration 002: Allow anon role to update status + log events
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
-- The frontend (anon key) needs to:
--   • UPDATE the status column on incidents
--   • INSERT rows into status_events (audit log)
-- No auth in MVP — operator is always 'demo_operator'.
-- ============================================================

-- Table-level write grants for anon
GRANT UPDATE ON incidents    TO anon;
GRANT INSERT ON status_events TO anon;

-- RLS: anon can update incidents (status field only enforced at app layer)
CREATE POLICY "anon_update_incidents"
  ON incidents
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- RLS: anon can insert into status_events
CREATE POLICY "anon_insert_status_events"
  ON status_events
  FOR INSERT TO anon
  WITH CHECK (true);
