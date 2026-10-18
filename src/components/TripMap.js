'use client'

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet'

// Uses CARTO tiles when a key is configured, otherwise plain OpenStreetMap
// (fine for the light, occasional use an admin panel gets).
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY
const TILE_URL = CARTO_KEY
  ? `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = CARTO_KEY
  ? '&copy; OpenStreetMap contributors &copy; CARTO'
  : '&copy; OpenStreetMap contributors'

function pinIcon(label, color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};color:#fff;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font:700 13px sans-serif">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

const pickupIcon = pinIcon('A', '#16a34a')
const dropoffIcon = pinIcon('B', '#dc2626')

function FitToPoints({ points }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')

  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 16)
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] })
    }
    // Leaflet needs a nudge when it is first shown inside a modal
    const timer = setTimeout(() => map.invalidateSize(), 150)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])

  return null
}

export default function TripMap({ pickup, dropoff, height = 240 }) {
  const pickupPoint = pickup?.lat && pickup?.lng ? [Number(pickup.lat), Number(pickup.lng)] : null
  const dropoffPoint =
    dropoff?.lat && dropoff?.lng ? [Number(dropoff.lat), Number(dropoff.lng)] : null

  const points = useMemo(
    () => [pickupPoint, dropoffPoint].filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pickupPoint?.join(','), dropoffPoint?.join(',')]
  )

  if (points.length === 0) {
    return (
      <div
        style={{ height }}
        className="rounded-xl bg-gray-100 flex items-center justify-center text-sm text-gray-400"
      >
        No location saved for this trip.
      </div>
    )
  }

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200 relative z-0">
      <MapContainer
        center={points[0]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <FitToPoints points={points} />

        {pickupPoint && (
          <Marker position={pickupPoint} icon={pickupIcon}>
            <Tooltip direction="top" offset={[0, -14]}>
              Pickup
            </Tooltip>
          </Marker>
        )}
        {dropoffPoint && (
          <Marker position={dropoffPoint} icon={dropoffIcon}>
            <Tooltip direction="top" offset={[0, -14]}>
              Drop-off
            </Tooltip>
          </Marker>
        )}
        {pickupPoint && dropoffPoint && (
          <Polyline
            positions={[pickupPoint, dropoffPoint]}
            pathOptions={{ color: '#16a34a', weight: 3, dashArray: '6 8' }}
          />
        )}
      </MapContainer>
    </div>
  )
}
