'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAdminGuard } from '@/lib/useAdminGuard'

export default function AdminTripsPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState('')
  const router = useRouter()

  const allowed = useAdminGuard()

  useEffect(() => {
    if (!allowed) return
    const loadTrips = async () => {
      const { data } = await supabase
        .from('trips')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(50)

      const tripsData = data || []

      // Pull in passenger + driver names/phones in one extra query rather
      // than relying on a specific foreign-key relationship name, so this
      // works regardless of how the profiles/drivers relations are set up.
      const passengerIds = [...new Set(tripsData.map((t) => t.passenger_id).filter(Boolean))]
      const driverIds = [...new Set(tripsData.map((t) => t.driver_id).filter(Boolean))]
      const allProfileIds = [...new Set([...passengerIds, ...driverIds])]

      let profilesById = {}
      if (allProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', allProfileIds)

        profilesById = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
      }

      const merged = tripsData.map((t) => ({
        ...t,
        passengerProfile: profilesById[t.passenger_id] || null,
        driverProfile: profilesById[t.driver_id] || null,
      }))

      setTrips(merged)
      setLoading(false)
    }
    loadTrips()
  }, [allowed, reloadKey])

  // Some timestamp columns (e.g. pickup/drop-off) may not exist on every
  // deployment's trips table — render "—" instead of crashing if missing.
  const formatTime = (value) => (value ? new Date(value).toLocaleString() : '—')

  const statusColors = {
    requested: 'text-gray-500',
    accepted: 'text-blue-600',
    arrived: 'text-blue-600',
    ongoing: 'text-yellow-600',
    completed: 'text-green-600',
    cancelled: 'text-red-500',
  }

  const CANCELLABLE = ['requested', 'accepted', 'arrived', 'ongoing']

  const cancelTrip = async (tripId) => {
    if (!window.confirm('Cancel this trip? The passenger and driver will see it as cancelled.')) return
    setCancellingId(tripId)
    setCancelError('')
    const { error: rpcError } = await supabase.rpc('admin_cancel_trip', { p_trip_id: tripId })
    setCancellingId(null)
    if (rpcError) {
      setCancelError(rpcError.message)
      return
    }
    setReloadKey((k) => k + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading trips...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <button
        onClick={() => router.push('/dashboard')}
        className="text-green-600 text-sm font-medium mb-4"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-green-600 text-center mb-6">
        All Trips
      </h1>

      {cancelError && (
        <p className="max-w-md mx-auto mb-3 text-center text-sm text-red-600">{cancelError}</p>
      )}

      {trips.length === 0 ? (
        <p className="text-center text-gray-400">No trips yet.</p>
      ) : (
        <div className="max-w-md mx-auto space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className={`font-semibold capitalize ${statusColors[trip.status]}`}>
                  {trip.status}
                </span>
                <span className="font-semibold text-green-700">
                  ₱{Number(trip.fare || 0).toFixed(2)}
                </span>
              </div>

              {trip.status === 'cancelled' && trip.cancelled_by && (
                <p className="text-xs text-gray-500">
                  Cancelled by {trip.cancelled_by}
                  {trip.cancel_reason ? ` (${String(trip.cancel_reason).replace(/_/g, ' ')})` : ''}
                </p>
              )}

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Passenger</p>
                  <p className="text-gray-700">
                    {trip.passengerProfile?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">{trip.passengerProfile?.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Driver</p>
                  <p className="text-gray-700">
                    {trip.driverProfile?.full_name || (trip.driver_id ? 'Unknown' : 'Not assigned')}
                  </p>
                  <p className="text-xs text-gray-500">{trip.driverProfile?.phone}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-2 grid grid-cols-1 gap-1 text-sm text-gray-600">
                <p>Requested: {formatTime(trip.requested_at)}</p>
                <p>Picked up: {formatTime(trip.pickup_at || trip.arrived_at || trip.started_at)}</p>
                <p>Dropped off: {formatTime(trip.dropoff_at || trip.completed_at)}</p>
              </div>

              <div className="border-t border-gray-100 pt-2 grid grid-cols-1 gap-1 text-sm text-gray-600">
                <p>
                  Pickup location:{' '}
                  {trip.pickup_lat && trip.pickup_lng
                    ? `${Number(trip.pickup_lat).toFixed(5)}, ${Number(trip.pickup_lng).toFixed(5)}`
                    : '—'}
                </p>
                <p>
                  Drop-off location:{' '}
                  {trip.dropoff_lat && trip.dropoff_lng
                    ? `${Number(trip.dropoff_lat).toFixed(5)}, ${Number(trip.dropoff_lng).toFixed(5)}`
                    : '—'}
                </p>
              </div>

              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm text-gray-600">
                <p>Distance: {Number(trip.distance_km || 0).toFixed(2)} km</p>
                <p>Amount: ₱{Number(trip.fare || 0).toFixed(2)}</p>
              </div>

              {CANCELLABLE.includes(trip.status) && (
                <button
                  onClick={() => cancelTrip(trip.id)}
                  disabled={cancellingId === trip.id}
                  className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {cancellingId === trip.id ? 'Cancelling...' : 'Cancel this trip'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
