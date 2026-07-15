import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const PRIORITY_COLOR = {
  high:   'text-red-400 bg-red-950/60 border-red-800/50',
  medium: 'text-amber-400 bg-amber-950/60 border-amber-800/50',
  low:    'text-green-400 bg-green-950/60 border-green-800/50',
}

const PRIORITY_TEXT = {
  high:   'text-red-400',
  medium: 'text-amber-400',
  low:    'text-green-400',
}

function humanize(str) {
  return str?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? ''
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1)  return `${Math.floor(diff / 60_000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ClusterDetailPanel({ clusterId, onClose, onSelectIncident }) {
  const [cluster, setCluster]   = useState(null)
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!clusterId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      supabase.from('incident_clusters').select('*').eq('id', clusterId).single(),
      supabase
        .from('incident_cluster_members')
        .select('incidents(id, title, incident_type, priority_label, severity_score, status, address, reported_at)')
        .eq('cluster_id', clusterId),
    ]).then(([clusterRes, membersRes]) => {
      if (cancelled) return
      if (clusterRes.error) {
        setError(clusterRes.error.message)
      } else {
        setCluster(clusterRes.data)
        const sorted = (membersRes.data ?? [])
          .map((row) => row.incidents)
          .filter(Boolean)
          .sort((a, b) => (b.severity_score ?? 0) - (a.severity_score ?? 0))
        setMembers(sorted)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [clusterId])

  return (
    <div className="w-80 shrink-0 bg-slate-900 border-l border-slate-700/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
          Cluster Detail
        </p>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 transition-colors text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center flex-1 text-slate-500 text-sm gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Loading…
        </div>
      )}

      {error && !loading && (
        <div className="m-4 p-3 bg-red-950/40 border border-red-800/50 rounded text-red-400 text-xs">
          {error}
        </div>
      )}

      {cluster && !loading && (
        <div className="flex-1 overflow-y-auto">
          {/* Cluster summary */}
          <div className="px-4 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border
                               ${PRIORITY_COLOR[cluster.priority_label] ?? 'text-slate-400'}`}>
                {cluster.priority_label}
              </span>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                {humanize(cluster.cluster_type)}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-100 mb-1">{cluster.summary}</p>
            <div className="flex gap-3 text-xs text-slate-600 mt-2">
              <span>Members: <span className="text-slate-400">{cluster.incident_count}</span></span>
              <span>Max score: <span className="text-slate-400">{cluster.severity_score}/100</span></span>
            </div>
          </div>

          {/* Member incidents */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs uppercase tracking-widest text-slate-600 mb-3">Member Incidents</p>
          </div>

          <div className="flex flex-col divide-y divide-slate-800">
            {members.map((inc) => (
              <button
                key={inc.id}
                onClick={() => onSelectIncident(inc.id)}
                className="text-left px-4 py-3 hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-slate-200 font-medium line-clamp-1">{inc.title}</p>
                  <span className={`text-xs font-bold uppercase shrink-0 ${PRIORITY_TEXT[inc.priority_label] ?? 'text-slate-400'}`}>
                    {inc.priority_label}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-500 truncate">{inc.address}</p>
                  <span className="text-xs text-slate-600 shrink-0 ml-2">
                    {timeAgo(inc.reported_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{humanize(inc.status)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
