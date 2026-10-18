'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import {
  cancellationInfo,
  fetchProfiles,
  formatDate,
  formatDateTime,
  money,
} from '@/lib/adminData'

// The list shown when a dashboard card is opened (drivers, passengers, trips).
// Names are clickable and open the matching detail view.
export default function CardList({ cardKey, onOpen, cache }) {
  const [items, setItems] = useState(cache.current[cardKey] || null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cache.current[cardKey]) return
    let cancelled = false

    const load = async () => {
      try {
        let result = []

        if (cardKey === 'totalDrivers' || cardKey === 'activeDrivers') {
          let query = supabase
            .from('drivers')
            .select('id, is_online, is_approved')
            .order('is_online', { ascending: false })
          if (cardKey === 'activeDrivers') query = query.eq('is_online', true)

          const { data, error: err } = await query
          if (err) throw err

          const profiles = await fetchProfiles((data || []).map((d) => d.id))
          result = (data || []).map((d) => ({ ...d, profile: profiles[d.id] || null }))
        } else if (cardKey === 'totalPassengers') {
          const { data, error: err } = await supabase
            .from('profiles')
            .select('id, full_name, phone, avatar_url, created_at')
            .eq('role', 'passenger')
            .order('created_at', { ascending: false })
            .limit(100)
          if (err) throw err
          result = data || []
        } else {
          const statusFilter =
            cardKey === 'activeTrips'
              ? ['accepted', 'arrived', 'ongoing']
              : cardKey === 'completedTrips'
              ? ['completed']
              : ['cancelled']

          const { data, error: err } = await supabase
            .from('trips')
            .select('*')
            .in('status', statusFilter)
            .order('requested_at', { ascending: false })
            .limit(100)
          if (err) throw err

          const trips = data || []
          const profiles = await fetchProfiles(
            trips.flatMap((t) => [t.passenger_id, t.driver_id])
          )
          result = trips.map((t) => ({
            ...t,
            passengerProfile: profiles[t.passenger_id] || null,
            driverProfile: profiles[t.driver_id] || null,
          }))
        }

        if (!cancelled) {
          cache.current[cardKey] = result
          setItems(result)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load details.')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [cardKey, cache])

  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!items) return <p className="text-gray-500 text-sm">Loading...</p>
  if (items.length === 0) return <p className="text-gray-400 text-sm">No records found.</p>

  if (cardKey === 'totalDrivers' || cardKey === 'activeDrivers') {
    return (
      <div className="space-y-2">
        {items.map((d) => (
          <div
            key={d.id}
            className="border border-gray-100 rounded-xl p-3 flex items-center gap-3"
          >
            <Avatar url={d.profile?.avatar_url} name={d.profile?.full_name} size={44} />
            <div className="min-w-0 flex-1">
              <button
                onClick={() => onOpen({ type: 'driver', id: d.id })}
                className="font-semibold text-green-700 hover:underline text-left truncate max-w-full"
              >
                {d.profile?.full_name || 'Unknown'}
              </button>
              <p className="text-xs text-gray-500">{d.profile?.phone}</p>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                d.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {d.is_online ? 'Online' : 'Offline'}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (cardKey === 'totalPassengers') {
    return (
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="border border-gray-100 rounded-xl p-3 flex items-center gap-3">
            <Avatar url={p.avatar_url} name={p.full_name} size={44} />
            <div className="min-w-0 flex-1">
              <button
                onClick={() => onOpen({ type: 'passenger', id: p.id })}
                className="font-semibold text-green-700 hover:underline text-left truncate max-w-full"
              >
                {p.full_name}
              </button>
              <p className="text-xs text-gray-500">{p.phone}</p>
            </div>
            <span className="text-xs text-gray-400">{formatDate(p.created_at)}</span>
          </div>
        ))}
      </div>
    )
  }

  // Trips (active / completed / cancelled)
  return (
    <div className="space-y-2">
      {items.map((t) => {
        const cancelled = cardKey === 'cancelledTrips' ? cancellationInfo(t) : null

        return (
          <div key={t.id} className="border border-gray-100 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => onOpen({ type: 'trip', id: t.id })}
                className="font-semibold text-green-700 hover:underline text-left truncate"
              >
                {t.passengerProfile?.full_name || 'Unknown passenger'}
              </button>
              <p className="text-sm font-semibold text-green-700 shrink-0">{money(t.fare)}</p>
            </div>

            <p className="text-xs text-gray-500 mt-0.5">
              {Number(t.distance_km || 0).toFixed(2)} km &middot; {formatDateTime(t.requested_at)}
            </p>

            <p className="text-xs text-gray-500 mt-0.5">
              Driver:{' '}
              {t.driver_id ? (
                <span className="font-medium text-gray-700">
                  {t.driverProfile?.full_name || 'Unknown'}
                </span>
              ) : (
                'None'
              )}
            </p>

            {cancelled && (
              <p className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${cancelled.tone}`}>
                {cancelled.label}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
