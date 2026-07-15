import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const SELECT_COLS = [
  'id', 'title', 'incident_type', 'priority_label',
  'severity_score', 'status', 'latitude', 'longitude',
  'address', 'reported_at', 'source_type',
].join(', ')

export function useIncidents(filters = {}, refreshKey = 0) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { incident_type, priority_label, status, source_type } = filters

  useEffect(() => {
    let cancelled = false

    async function fetchIncidents() {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('incidents')
        .select(SELECT_COLS)
        .order('severity_score', { ascending: false })
        .limit(600)

      if (incident_type)   query = query.eq('incident_type',   incident_type)
      if (priority_label)  query = query.eq('priority_label',  priority_label)
      if (status)          query = query.eq('status',          status)
      if (source_type)     query = query.eq('source_type',     source_type)

      const { data, error: fetchError } = await query

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setIncidents(data ?? [])
      }
      setLoading(false)
    }

    fetchIncidents()
    return () => { cancelled = true }
  }, [incident_type, priority_label, status, source_type, refreshKey])

  return { incidents, loading, error }
}
