import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useIncidentDetail(id) {
  const [incident, setIncident] = useState(null)
  const [statusEvents, setStatusEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!id) {
      setIncident(null)
      setStatusEvents([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      supabase.from('incidents').select('*').eq('id', id).single(),
      supabase
        .from('status_events')
        .select('*')
        .eq('incident_id', id)
        .order('created_at', { ascending: false }),
    ]).then(([incRes, eventsRes]) => {
      if (cancelled) return
      if (incRes.error) {
        setError(incRes.error.message)
      } else {
        setIncident(incRes.data)
        setStatusEvents(eventsRes.data ?? [])
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [id, tick])

  return { incident, statusEvents, loading, error, refetch }
}
