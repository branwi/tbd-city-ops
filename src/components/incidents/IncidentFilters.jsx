const INCIDENT_TYPES = [
  'debris_on_road', 'fallen_tree', 'flooding', 'graffiti',
  'noise_complaint', 'pothole', 'power_outage', 'road_damage',
  'traffic_signal_issue', 'water_main_break',
]

const STATUSES = ['new', 'under_review', 'verified', 'resolved', 'dismissed']
const PRIORITIES = ['high', 'medium', 'low']
const SOURCE_TYPES = ['civic_report', 'citizen_report', 'weather_alert', 'transit_alert']

const PRIORITY_DOT = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-green-500',
}

function humanize(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function FilterGroup({ label, value, options, onChange, renderOption }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-slate-500">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2
                   focus:outline-none focus:ring-1 focus:ring-slate-500 appearance-none cursor-pointer"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {renderOption ? renderOption(opt) : opt}
          </option>
        ))}
      </select>
    </div>
  )
}

export function IncidentFilters({ filters, onChange, totalCount }) {
  function set(key, val) {
    onChange({ ...filters, [key]: val })
  }

  function clearAll() {
    onChange({ incident_type: null, priority_label: null, status: null, source_type: null })
  }

  const hasAny = Object.values(filters).some(Boolean)

  return (
    <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-700/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Filters</p>
          {hasAny && (
            <button
              onClick={clearAll}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-1">
          {totalCount} incident{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        <FilterGroup
          label="Priority"
          value={filters.priority_label}
          options={PRIORITIES}
          onChange={(val) => set('priority_label', val)}
          renderOption={(opt) => (
            humanize(opt)
          )}
        />

        <FilterGroup
          label="Type"
          value={filters.incident_type}
          options={INCIDENT_TYPES}
          onChange={(val) => set('incident_type', val)}
          renderOption={humanize}
        />

        <FilterGroup
          label="Status"
          value={filters.status}
          options={STATUSES}
          onChange={(val) => set('status', val)}
          renderOption={humanize}
        />

        <FilterGroup
          label="Source"
          value={filters.source_type}
          options={SOURCE_TYPES}
          onChange={(val) => set('source_type', val)}
          renderOption={humanize}
        />
      </div>

      {/* Priority legend */}
      <div className="px-4 py-3 border-t border-slate-800 shrink-0">
        <p className="text-xs uppercase tracking-widest text-slate-600 mb-2">Legend</p>
        <div className="flex flex-col gap-1.5">
          {PRIORITIES.map((p) => (
            <div key={p} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_DOT[p]}`} />
              <span className="text-xs text-slate-400 capitalize">{p} priority</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
