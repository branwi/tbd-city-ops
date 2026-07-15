export function DashboardLayout({ children }) {
  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700/50 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Live" />
          <span className="text-sm font-bold tracking-widest text-slate-100 uppercase">
            City Ops
          </span>
          <span className="hidden sm:block text-slate-700">|</span>
          <span className="hidden sm:block text-sm text-slate-400 tracking-wide">
            Incident Dashboard
          </span>
        </div>

        {/* Right: tech tags + disclaimer */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            {['React', 'Supabase', 'PostGIS', 'Leaflet'].map((tag) => (
              <span
                key={tag}
                className="text-xs text-slate-600 bg-slate-800 border border-slate-700/50
                           px-2 py-0.5 rounded font-mono"
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="text-xs text-slate-600 border-l border-slate-700/50 pl-3">
            Synthetic data · No PII
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
