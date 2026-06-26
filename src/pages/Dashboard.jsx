import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function Dashboard() {
  const [connectionStatus, setConnectionStatus] = useState('checking')
  const [incidentCount, setIncidentCount] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function testConnection() {
      // Query the incidents table — returns 0 rows (table may not exist yet)
      // but confirms the Supabase connection is live.
      const { count, error } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })

      if (error) {
        // "relation does not exist" means connected but table not created yet (Phase 2)
        if (error.code === '42P01') {
          setConnectionStatus('connected')
          setIncidentCount(0)
        } else {
          setConnectionStatus('error')
          setError(error.message)
        }
      } else {
        setConnectionStatus('connected')
        setIncidentCount(count ?? 0)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      {/* Connection status card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-xl p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Supabase Connection
        </h2>

        {connectionStatus === 'checking' && (
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-slate-300">Connecting…</span>
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-green-300 font-medium">Connected</span>
            </div>
            <div className="text-slate-400 text-sm font-mono">
              incidents in database:{' '}
              <span className="text-slate-200 font-semibold">{incidentCount}</span>
            </div>
            {incidentCount === 0 && (
              <p className="text-xs text-slate-500">
                Table not created yet — that's Phase 2. Connection is working.
              </p>
            )}
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-red-300 font-medium">Connection failed</span>
            </div>
            <p className="text-xs text-red-400 font-mono break-all">{error}</p>
            <p className="text-xs text-slate-500">
              Check that <code className="text-slate-300">.env.local</code> has the correct{' '}
              <code className="text-slate-300">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-slate-300">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        )}
      </div>

      {/* Phase roadmap placeholder */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-xl p-6 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Build Progress
        </h2>
        <ul className="space-y-2 text-sm">
          {[
            { phase: 'Phase 1', label: 'Foundation', done: true },
            { phase: 'Phase 2', label: 'Data Model & Sample Data', done: false },
            { phase: 'Phase 3', label: 'Map Dashboard', done: false },
            { phase: 'Phase 4', label: 'Detail Panel & Review Workflow', done: false },
            { phase: 'Phase 5', label: 'Clustering & Deduplication', done: false },
            { phase: 'Phase 6', label: 'AI Classification', done: false },
            { phase: 'Phase 7', label: 'Portfolio Polish', done: false },
          ].map(({ phase, label, done }) => (
            <li key={phase} className="flex items-center gap-3">
              <span className={`w-4 h-4 rounded text-xs flex items-center justify-center font-bold
                ${done ? 'bg-green-900/60 text-green-400' : 'bg-slate-800 text-slate-600'}`}>
                {done ? '✓' : '·'}
              </span>
              <span className={done ? 'text-green-300' : 'text-slate-500'}>
                <span className="text-slate-400 font-mono text-xs mr-2">{phase}</span>
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
