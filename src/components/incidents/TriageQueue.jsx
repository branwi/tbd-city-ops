export function TriageQueue({ incidents, onJumpToNext }) {
  const unreviewed = incidents.filter(
    (inc) => inc.status === 'new' && inc.priority_label === 'high'
  )

  if (unreviewed.length === 0) return null

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-red-950/50 border-b border-red-900/40 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        <span className="text-sm text-red-300 font-medium">
          {unreviewed.length} unreviewed high-priority incident
          {unreviewed.length !== 1 ? 's' : ''}
        </span>
      </div>
      <button
        onClick={() => onJumpToNext(unreviewed[0].id)}
        className="text-xs bg-red-900/40 border border-red-800/50 text-red-300
                   px-3 py-1 rounded hover:bg-red-800/60 transition-colors"
      >
        Review next →
      </button>
    </div>
  )
}
