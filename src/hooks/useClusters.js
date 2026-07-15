import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useClusters(refreshKey = 0) {
  const [clusters, setClusters]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    supabase
      .from('incident_clusters')
      .select('id, cluster_type, centroid_lat, centroid_lon, incident_count, severity_score, priority_label, summary')
      .not('centroid_lat', 'is', null)
      .order('severity_score', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else setClusters(data ?? [])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [refreshKey])

  return { clusters, loading, error }
}
