import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { ClusterMarker } from './ClusterMarker'

const PRIORITY_COLOR = {
  high:   '#DC2626',
  medium: '#D97706',
  low:    '#16A34A',
}

const CITY_CENTER  = [41.8781, -87.6298]
const CLUSTER_ZOOM = 13   // below this zoom: show clusters; at/above: show individual markers

function ZoomWatcher({ onZoom }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) })
  return null
}

export function IncidentMap({
  incidents, clusters = [],
  selectedId, selectedClusterId,
  onSelect, onSelectCluster,
}) {
  const [zoom, setZoom] = useState(12)
  const showClusters = zoom < CLUSTER_ZOOM && clusters.length > 0

  return (
    <MapContainer center={CITY_CENTER} zoom={12} className="w-full h-full">
      <ZoomWatcher onZoom={setZoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {showClusters
        ? clusters.map((cluster) => (
            <ClusterMarker
              key={cluster.id}
              cluster={cluster}
              isSelected={cluster.id === selectedClusterId}
              onSelect={onSelectCluster}
            />
          ))
        : incidents.map((inc) => {
            if (inc.latitude == null || inc.longitude == null) return null
            const color      = PRIORITY_COLOR[inc.priority_label] ?? '#64748b'
            const isSelected = inc.id === selectedId
            return (
              <CircleMarker
                key={inc.id}
                center={[inc.latitude, inc.longitude]}
                radius={isSelected ? 10 : 5}
                pathOptions={{
                  color:       isSelected ? '#ffffff' : color,
                  fillColor:   color,
                  fillOpacity: isSelected ? 1 : 0.75,
                  weight:      isSelected ? 2 : 1,
                }}
                eventHandlers={{ click: () => onSelect(inc.id) }}
              />
            )
          })}
    </MapContainer>
  )
}
