import { Marker } from 'react-leaflet'
import L from 'leaflet'

const PRIORITY_COLOR = {
  high:   '#DC2626',
  medium: '#D97706',
  low:    '#16A34A',
}

function makeIcon(count, priority, isSelected) {
  const color = PRIORITY_COLOR[priority] ?? '#64748b'
  const size  = Math.min(28 + Math.floor(count / 4) * 4, 52)
  const bg    = isSelected ? `${color}55` : `${color}22`
  const ring  = isSelected ? `3px solid #ffffff` : `2px solid ${color}`
  const glow  = isSelected ? `0 0 10px ${color}88` : `0 0 6px ${color}33`

  return L.divIcon({
    html: `<div style="
      width:${size}px; height:${size}px;
      background:${bg};
      border:${ring};
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:${size > 40 ? 13 : 11}px;
      font-weight:700;
      color:${isSelected ? '#ffffff' : color};
      font-family:ui-monospace,monospace;
      box-shadow:${glow};
      cursor:pointer;
    ">${count}</div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function ClusterMarker({ cluster, isSelected, onSelect }) {
  if (cluster.centroid_lat == null || cluster.centroid_lon == null) return null

  return (
    <Marker
      position={[cluster.centroid_lat, cluster.centroid_lon]}
      icon={makeIcon(cluster.incident_count, cluster.priority_label, isSelected)}
      eventHandlers={{ click: () => onSelect(cluster.id) }}
    />
  )
}
