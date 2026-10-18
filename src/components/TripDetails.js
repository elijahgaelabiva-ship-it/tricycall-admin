'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import DetailRow from '@/components/DetailRow'
import LazyTripMap from '@/components/LazyTripMap'
import {
  cancellationInfo,
  fetchProfiles,
  formatDateTime,
  mapsLink,
  money,
  STATUS_STYLES,
} from '@/lib/adminData'

function PersonCard({ title, person, plate, onClick, emptyText }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 flex-1 min-w-0">
      <p className="text-xs text-gray-400 mb-2">{title}</p>
      {person ? (
        <button onClick={onClick} className="flex items-center gap-3 text-left w-full">
          <Avatar url={person.avatar_url} name={person.full_name} size={44} />
          <span className="min-w-0">
            <span className="block font-semibold text-green-700 hover:underline truncate">
              {person.full_name || 'Unknown'}
            </span>
            <span className="block text-xs text-gray-500 truncate">{person.phone}</span>
            {plate && <span className="block text-xs text-gray-500">Plate: {plate}</span>}
          </span>
        </button>
      ) : (
        <p className="text-sm text-gray-400">{emptyText}</p>
      )}
    </div>
  )
}

export default function TripDetails({ id, onOpen }) {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (tripError) throw tripError
        if (!trip) {
          if (!cancelled) setInfo({ trip: null })
          return
        }

        const [profiles, vehicleRes] = await Promise.all([
          fetchProfiles([trip.passenger_id, trip.driver_id]),
          trip.driver_id
            ? supabase.from('vehicles').select('plate_number, model').eq('driver_id', trip.driver_id).limit(1)
            : Promise.resolve({ data: [] }),
        ])

        if (!cancelled) {
          setInfo({
            trip,
            passenger: profiles[trip.passenger_id] || null,
            driver: profiles[trip.driver_id] || null,
            vehicle: (vehicleRes.data || [])[0] || null,
          })
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load trip details.')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!info) return <p className="text-gray-500 text-sm">Loading...</p>
  if (!info.trip) return <p className="text-gray-500 text-sm">Trip not found.</p>

  const { trip, passenger, driver, vehicle } = info
  const status = STATUS_STYLES[trip.status] || STATUS_STYLES.requested
  const cancelled = trip.status === 'cancelled' ? cancellationInfo(trip) : null

  // Only show timestamps this trip actually has
  const times = [
    ['Requested', trip.requested_at],
    ['Accepted by driver', trip.accepted_at],
    ['Driver arrived', trip.arrived_at],
    ['Trip started', trip.started_at || trip.pickup_at],
    ['Completed', trip.completed_at || trip.dropoff_at],
    ['Cancelled', trip.cancelled_at],
  ].filter(([, value]) => value)

  const hasPickup = trip.pickup_lat && trip.pickup_lng
  const hasDropoff = trip.dropoff_lat && trip.dropoff_lng

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${status.className}`}>
          {status.label}
        </span>
        <p className="text-xl font-bold text-green-700">{money(trip.fare)}</p>
      </div>

      {cancelled && (
        <div className={`rounded-xl p-3 ${cancelled.tone}`}>
          <p className="font-bold">{cancelled.label}</p>
          <p className="text-sm mt-0.5">{cancelled.detail}</p>
          {trip.driver_id && (
            <p className="text-sm mt-1">
              Driver who accepted: <span className="font-semibold">{driver?.full_name || 'Unknown'}</span>
            </p>
          )}
          {!trip.driver_id && <p className="text-sm mt-1">No driver had accepted this trip.</p>}
        </div>
      )}

      <div className="flex gap-3">
        <PersonCard
          title="Passenger"
          person={passenger}
          onClick={() => onOpen({ type: 'passenger', id: trip.passenger_id })}
          emptyText="Unknown"
        />
        <PersonCard
          title={trip.status === 'cancelled' ? 'Driver who accepted' : 'Driver'}
          person={driver}
          plate={vehicle?.plate_number}
          onClick={() => onOpen({ type: 'driver', id: trip.driver_id })}
          emptyText="No driver assigned"
        />
      </div>

      <div className="rounded-xl border border-gray-200 px-4">
        {times.map(([label, value]) => (
          <DetailRow key={label} label={label}>
            {formatDateTime(value)}
          </DetailRow>
        ))}
        <DetailRow label="Distance">{Number(trip.distance_km || 0).toFixed(2)} km</DetailRow>
        <DetailRow label="Fare">{money(trip.fare)}</DetailRow>
      </div>

      <div>
        <h4 className="font-bold text-gray-800 mb-2">Pickup and drop-off</h4>
        <LazyTripMap
          pickup={{ lat: trip.pickup_lat, lng: trip.pickup_lng }}
          dropoff={{ lat: trip.dropoff_lat, lng: trip.dropoff_lng }}
          height={260}
        />
        <p className="mt-1 text-xs text-gray-400">
          A = pickup, B = drop-off. The dashed line is a straight line between them, not the road
          taken.
        </p>

        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
              A
            </span>
            <div className="min-w-0">
              <p className="text-gray-800">
                {trip.pickup_address ||
                  (hasPickup
                    ? `${Number(trip.pickup_lat).toFixed(5)}, ${Number(trip.pickup_lng).toFixed(5)}`
                    : 'Not saved')}
              </p>
              {hasPickup && (
                <a
                  href={mapsLink(trip.pickup_lat, trip.pickup_lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-green-700 hover:underline"
                >
                  Open in Google Maps
                </a>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
              B
            </span>
            <div className="min-w-0">
              <p className="text-gray-800">
                {trip.dropoff_address ||
                  (hasDropoff
                    ? `${Number(trip.dropoff_lat).toFixed(5)}, ${Number(trip.dropoff_lng).toFixed(5)}`
                    : 'Not saved')}
              </p>
              {hasDropoff && (
                <a
                  href={mapsLink(trip.dropoff_lat, trip.dropoff_lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-green-700 hover:underline"
                >
                  Open in Google Maps
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
