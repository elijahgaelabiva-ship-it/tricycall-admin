'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import DetailRow from '@/components/DetailRow'
import LazyTripMap from '@/components/LazyTripMap'
import { fetchProfiles, formatDate, formatDateTime, money, STATUS_STYLES } from '@/lib/adminData'

export default function PassengerDetails({ id, onOpen }) {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [mapTripId, setMapTripId] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [profileRes, allStatusRes, recentRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
          supabase.from('trips').select('status').eq('passenger_id', id),
          supabase
            .from('trips')
            .select('*')
            .eq('passenger_id', id)
            .order('requested_at', { ascending: false })
            .limit(30),
        ])

        if (profileRes.error) throw profileRes.error
        if (recentRes.error) throw recentRes.error

        const trips = recentRes.data || []
        const driverProfiles = await fetchProfiles(trips.map((t) => t.driver_id))
        if (cancelled) return

        const statuses = allStatusRes.data || []
        setInfo({
          profile: profileRes.data,
          trips,
          driverProfiles,
          total: statuses.length,
          completed: statuses.filter((s) => s.status === 'completed').length,
          cancelled: statuses.filter((s) => s.status === 'cancelled').length,
        })
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load passenger details.')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!info) return <p className="text-gray-500 text-sm">Loading...</p>

  const { profile, trips, driverProfiles } = info
  if (!profile) return <p className="text-gray-500 text-sm">Passenger not found.</p>

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <Avatar url={profile.avatar_url} name={profile.full_name} size={112} />
        <h3 className="mt-3 text-xl font-bold text-gray-800">{profile.full_name}</h3>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 px-4">
        <DetailRow label="Phone">{profile.phone || '—'}</DetailRow>
        <DetailRow label="Joined">{formatDate(profile.created_at)}</DetailRow>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xl font-bold text-gray-800">{info.total}</p>
          <p className="text-xs text-gray-500">Total rides</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xl font-bold text-green-700">{info.completed}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xl font-bold text-red-500">{info.cancelled}</p>
          <p className="text-xs text-gray-500">Cancelled</p>
        </div>
      </div>

      <h4 className="mt-6 mb-2 font-bold text-gray-800">Rides</h4>

      {trips.length === 0 ? (
        <p className="text-sm text-gray-400">This passenger hasn&apos;t booked any rides yet.</p>
      ) : (
        <div className="space-y-3">
          {trips.map((t) => {
            const status = STATUS_STYLES[t.status] || STATUS_STYLES.requested
            const driver = driverProfiles[t.driver_id]
            const showMap = mapTripId === t.id

            return (
              <div key={t.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {formatDateTime(t.requested_at)}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="font-bold text-green-700">{money(t.fare)}</p>
                </div>

                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="text-gray-400">Driver: </span>
                    {t.driver_id ? (
                      <button
                        onClick={() => onOpen({ type: 'driver', id: t.driver_id })}
                        className="font-semibold text-green-700 hover:underline"
                      >
                        {driver?.full_name || 'Unknown'}
                      </button>
                    ) : (
                      'Not assigned'
                    )}
                  </p>
                  <p>
                    <span className="text-gray-400">Pickup: </span>
                    {t.pickup_address ||
                      (t.pickup_lat
                        ? `${Number(t.pickup_lat).toFixed(5)}, ${Number(t.pickup_lng).toFixed(5)}`
                        : '—')}
                  </p>
                  <p>
                    <span className="text-gray-400">Drop-off: </span>
                    {t.dropoff_address ||
                      (t.dropoff_lat
                        ? `${Number(t.dropoff_lat).toFixed(5)}, ${Number(t.dropoff_lng).toFixed(5)}`
                        : '—')}
                  </p>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setMapTripId(showMap ? null : t.id)}
                    className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {showMap ? 'Hide map' : 'Show on map'}
                  </button>
                  <button
                    onClick={() => onOpen({ type: 'trip', id: t.id })}
                    className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Trip details
                  </button>
                </div>

                {showMap && (
                  <div className="mt-3">
                    <LazyTripMap
                      pickup={{ lat: t.pickup_lat, lng: t.pickup_lng }}
                      dropoff={{ lat: t.dropoff_lat, lng: t.dropoff_lng }}
                      height={220}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      A = pickup, B = drop-off. The dashed line is a straight line between them, not
                      the road taken.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
