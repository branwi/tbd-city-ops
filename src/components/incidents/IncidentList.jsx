const PRIORITY_BORDER = {
  high:   'border-l-red-500',
  medium: 'border-l-amber-500',
  low:    'border-l-green-500',
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

function IncidentCard({ incident, isSelected, onSelect }) {
  const borderClass = PRIORITY_BORDER[incident.priority_label] ?? 'border-l-slate-600'
  const textClass   = PRIORITY_TEXT[incident.priority_label]   ?? 'text-slate-400'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(incident.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(incident.id)}
      className={`border-l-2 ${borderClass} transition-colors px-4 py-3 cursor-pointer
                  ${isSelected ? 'bg-slate-800 ring-1 ring-inset ring-slate-600' : 'bg-slate-900 hover:bg-slate-800/70'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-200 font-medium leading-snug line-clamp-1">
          {incident.title}
        </p>
        <span className={`text-xs font-bold uppercase shrink-0 ${textClass}`}>
          {incident.priority_label}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
          {humanize(incident.incident_type)}
        </span>
        <span className="text-xs text-slate-600">
          {humanize(incident.status)}
        </span>
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-slate-500 truncate">{incident.address}</p>
        <span className="text-xs text-slate-600 shrink-0 ml-2">
          {timeAgo(incident.reported_at)}
        </span>
      </div>
    </div>
  )
}

export function IncidentList({ incidents, loading, selectedId, onSelect }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse mr-2" />
        Loading incidents…
      </div>
    )
  }

  if (incidents.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        No incidents match the current filters.
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-slate-800">
      {incidents.map((inc) => (
        <IncidentCard
          key={inc.id}
          incident={inc}
          isSelected={inc.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
