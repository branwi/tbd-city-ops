import { useState } from 'react'
import { useIncidentDetail } from '../../hooks/useIncidentDetail'
import { updateIncidentStatus } from '../../lib/incidentQueries'

const STATUS_TRANSITIONS = {
  new:          ['under_review', 'dismissed'],
  under_review: ['verified', 'dismissed'],
  verified:     ['resolved', 'dismissed'],
  resolved:     [],
  dismissed:    [],
}

const ACTION_STYLE = {
  under_review: 'border-blue-700/60 text-blue-300 hover:bg-blue-900/50',
  verified:     'border-green-700/60 text-green-300 hover:bg-green-900/50',
  resolved:     'border-slate-600 text-slate-300 hover:bg-slate-700/60',
  dismissed:    'border-red-800/60 text-red-400 hover:bg-red-900/40',
}

const PRIORITY_COLOR = {
  high:    'text-red-400 bg-red-950/60 border-red-800/50',
  medium:  'text-amber-400 bg-amber-950/60 border-amber-800/50',
  low:     'text-green-400 bg-green-950/60 border-green-800/50',
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

function Section({ title, children }) {
  return (
    <div className="px-4 py-3 border-b border-slate-800">
      <p className="text-xs uppercase tracking-widest text-slate-600 mb-2">{title}</p>
      {children}
    </div>
  )
}

const SCORE_BAR_COLOR = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-green-500',
}

function ScoreBar({ score, priority }) {
  const pct = Math.min(Math.max(score ?? 0, 0), 100)
  const barColor = SCORE_BAR_COLOR[priority] ?? 'bg-slate-500'
  return (
    <div>
      <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden mb-1">
        {/* Threshold zones */}
        <div className="absolute inset-y-0 left-0 w-[31%] bg-green-900/30" />
        <div className="absolute inset-y-0 left-[31%] w-[35%] bg-amber-900/30" />
        <div className="absolute inset-y-0 left-[66%] right-0 bg-red-900/30" />
        {/* Score fill */}
        <div
          className={`absolute inset-y-0 left-0 ${barColor} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
        {/* Threshold ticks */}
        <div className="absolute inset-y-0 left-[31%] w-px bg-slate-600" />
        <div className="absolute inset-y-0 left-[66%] w-px bg-slate-600" />
      </div>
      <div className="flex justify-between text-xs text-slate-700">
        <span>0</span>
        <span style={{ marginLeft: '25%' }}>med</span>
        <span style={{ marginLeft: '26%' }}>high</span>
        <span>100</span>
      </div>
    </div>
  )
}

function ConfidenceMeter({ confidence }) {
  const pct = Math.round((confidence ?? 0) * 100)
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 shrink-0 font-mono w-8 text-right">{pct}%</span>
    </div>
  )
}

export function IncidentDetailPanel({ id, onClose, onStatusUpdate }) {
  const { incident, statusEvents, loading, error, refetch } = useIncidentDetail(id)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  async function handleStatusChange(newStatus) {
    if (!incident) return
    setSaving(true)
    setSaveError(null)
    const { error: err } = await updateIncidentStatus(incident.id, incident.status, newStatus)
    setSaving(false)
    if (err) {
      setSaveError(err)
    } else {
      refetch()
      onStatusUpdate()
    }
  }

  return (
    <div className="w-80 shrink-0 bg-slate-900 border-l border-slate-700/50 flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
          Incident Detail
        </p>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 transition-colors text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center flex-1 text-slate-500 text-sm gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Loading…
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="m-4 p-3 bg-red-950/40 border border-red-800/50 rounded text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Content */}
      {incident && !loading && (
        <div className="flex-1 overflow-y-auto">
          {/* Title + meta */}
          <div className="px-4 py-4 border-b border-slate-800">
            <div className="flex items-start gap-2 mb-2 flex-wrap">
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border
                               ${PRIORITY_COLOR[incident.priority_label] ?? 'text-slate-400'}`}>
                {incident.priority_label}
              </span>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                {humanize(incident.incident_type)}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-slate-100 leading-snug mb-1">
              {incident.title}
            </h2>
            <p className="text-xs text-slate-500">{incident.address}</p>
            <p className="text-xs text-slate-600 mt-1">{timeAgo(incident.reported_at)}</p>
          </div>

          {/* Severity score + confidence bars */}
          <div className="px-4 py-3 border-b border-slate-800 flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-600 uppercase tracking-widest">Severity</span>
                <span className="text-slate-300 font-mono font-semibold">
                  {incident.severity_score}/100
                </span>
              </div>
              <ScoreBar score={incident.severity_score} priority={incident.priority_label} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-600 uppercase tracking-widest">Confidence</span>
              </div>
              <ConfidenceMeter confidence={incident.confidence_score} />
            </div>
          </div>

          {/* Description */}
          {incident.description && (
            <Section title="Description">
              <p className="text-xs text-slate-400 leading-relaxed">{incident.description}</p>
            </Section>
          )}

          {/* AI advisory */}
          {incident.ai_summary && (
            <Section title="AI Advisory">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded p-3">
                <p className="text-xs text-amber-400/80 font-mono leading-relaxed">
                  {incident.ai_summary}
                </p>
              </div>
            </Section>
          )}

          {/* Priority reason */}
          {incident.priority_reason && (
            <Section title="Why This Priority?">
              <p className="text-xs text-slate-400 leading-relaxed">{incident.priority_reason}</p>
            </Section>
          )}

          {/* Status actions */}
          <Section title="Status">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">Current:</span>
              <span className="text-xs font-semibold text-slate-200">
                {humanize(incident.status)}
              </span>
            </div>

            {saveError && (
              <p className="text-xs text-red-400 mb-2">{saveError}</p>
            )}

            {STATUS_TRANSITIONS[incident.status]?.length > 0 ? (
              <div className="flex flex-col gap-2">
                {STATUS_TRANSITIONS[incident.status].map((next) => (
                  <button
                    key={next}
                    disabled={saving}
                    onClick={() => handleStatusChange(next)}
                    className={`text-xs border rounded px-3 py-2 text-left transition-colors
                                disabled:opacity-40 disabled:cursor-not-allowed
                                ${ACTION_STYLE[next]}`}
                  >
                    → Mark as {humanize(next)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic">
                No further actions — incident is {humanize(incident.status)}.
              </p>
            )}
          </Section>

          {/* Status history */}
          <Section title="History">
            {statusEvents.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No status changes yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {statusEvents.map((evt) => (
                  <div key={evt.id} className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-0.5" />
                      <div className="w-px flex-1 bg-slate-800 mt-1" />
                    </div>
                    <div className="pb-3">
                      <p className="text-xs text-slate-300">
                        {humanize(evt.previous_status)} → {humanize(evt.new_status)}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{timeAgo(evt.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Source metadata */}
          <div className="px-4 py-3">
            <p className="text-xs text-slate-600">
              Source: {humanize(incident.source_type)} · ID: {incident.source_id}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
