-- ============================================================
-- Migration 003: Add centroid lat/lon to incident_clusters
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
-- The PostGIS centroid column is opaque to the JS client.
-- These plain numeric columns let the frontend place markers
-- without parsing hex-encoded geography values.
-- ============================================================

ALTER TABLE incident_clusters
  ADD COLUMN IF NOT EXISTS centroid_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS centroid_lon DOUBLE PRECISION;
