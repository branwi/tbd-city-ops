import { useState } from 'react'
import { useIncidents } from '../hooks/useIncidents'
import { useClusters } from '../hooks/useClusters'
import { IncidentMap } from '../components/map/IncidentMap'
import { IncidentFilters } from '../components/incidents/IncidentFilters'
import { IncidentList } from '../components/incidents/IncidentList'
import { IncidentDetailPanel } from '../components/incidents/IncidentDetailPanel'
import { ClusterDetailPanel } from '../components/incidents/ClusterDetailPanel'
import { TriageQueue } from '../components/incidents/TriageQueue'

const DEFAULT_FILTERS = {
  incident_type:  null,
  priority_label: null,
  status:         null,
  source_type:    null,
}

export function Dashboard() {
  const [filters,         setFilters]         = useState(DEFAULT_FILTERS)
  const [selectedId,      setSelectedId]      = useState(null)
  const [selectedCluster, setSelectedCluster] = useState(null)
  const [refreshKey,      setRefreshKey]      = useState(0)

  const { incidents, loading, error } = useIncidents(filters, refreshKey)
  const { clusters }                  = useClusters(refreshKey)

  function selectIncident(id) {
    setSelectedId(id)
    setSelectedCluster(null)
  }

  function selectCluster(id) {
    setSelectedCluster(id)
    setSelectedId(null)
  }

  function closePanel() {
    setSelectedId(null)
    setSelectedCluster(null)
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS)
    setSelectedId(null)
    setSelectedCluster(null)
    setRefreshKey((k) => k + 1)
  }

  function handleStatusUpdate() {
    setRefreshKey((k) => k + 1)
  }

  const highCount   = incidents.filter((i) => i.priority_label === 'high').length
  const medCount    = incidents.filter((i) => i.priority_label === 'medium').length
  const lowCount    = incidents.filter((i) => i.priority_label === 'low').length

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-slate-900 border border-red-700/40 rounded-xl p-6 max-w-md">
          <p className="text-red-400 font-medium mb-2">Connection error</p>
          <p className="text-xs text-red-400 font-mono break-all">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left: filter sidebar */}
      <IncidentFilters
        filters={filters}
        onChange={setFilters}
        totalCount={incidents.length}
      />

      {/* Center: stats bar + triage bar + map + list */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Stats + reset bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900
                        border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500">
              Total{' '}
              <span className="text-slate-200 font-mono font-semibold">
                {loading ? '…' : incidents.length}
              </span>
            </span>
            <span className="text-red-400">
              High <span className="font-mono font-semibold">{loading ? '…' : highCount}</span>
            </span>
            <span className="text-amber-400">
              Med <span className="font-mono font-semibold">{loading ? '…' : medCount}</span>
            </span>
            <span className="text-green-400">
              Low <span className="font-mono font-semibold">{loading ? '…' : lowCount}</span>
            </span>
          </div>
          <button
            onClick={handleReset}
            title="Reset all filters and refresh data"
            className="text-xs text-slate-500 hover:text-slate-200 transition-colors
                       flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800"
          >
            ↺ Reset
          </button>
        </div>

        <TriageQueue incidents={incidents} onJumpToNext={selectIncident} />

        {/* Map */}
        <div className="h-[400px] shrink-0 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center
                            bg-slate-950/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                Loading map…
              </div>
            </div>
          )}
          <IncidentMap
            incidents={incidents}
            clusters={clusters}
            selectedId={selectedId}
            selectedClusterId={selectedCluster}
            onSelect={selectIncident}
            onSelectCluster={selectCluster}
          />
        </div>

        {/* Zoom hint */}
        {clusters.length > 0 && (
          <div className="px-4 py-1 bg-slate-900/80 border-b border-slate-800 shrink-0">
            <p className="text-xs text-slate-600">
              Zoom past level 13 to see individual markers · {clusters.length} clusters loaded
            </p>
          </div>
        )}

        {/* Incident list */}
        <div className="flex-1 overflow-y-auto border-t border-slate-800 bg-slate-950">
          <div className="sticky top-0 z-10 px-4 py-2 bg-slate-900/90 backdrop-blur-sm
                          border-b border-slate-800 flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-slate-500">Incidents</p>
            <p className="text-xs text-slate-600 font-mono">
              {loading ? '…' : `${incidents.length} shown`}
            </p>
          </div>
          <IncidentList
            incidents={incidents}
            loading={loading}
            selectedId={selectedId}
            onSelect={selectIncident}
          />
        </div>
      </div>

      {/* Right: incident detail panel */}
      {selectedId && (
        <IncidentDetailPanel
          id={selectedId}
          onClose={closePanel}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Right: cluster detail panel */}
      {selectedCluster && !selectedId && (
        <ClusterDetailPanel
          clusterId={selectedCluster}
          onClose={closePanel}
          onSelectIncident={selectIncident}
        />
      )}
    </div>
  )
}
