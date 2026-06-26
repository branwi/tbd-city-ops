export function DashboardLayout({ children }) {
  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold tracking-widest text-slate-300 uppercase">
            City Ops
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-sm text-slate-400">Incident Dashboard</span>
        </div>
        <div className="text-xs text-slate-500 font-mono">MVP v0.1</div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
