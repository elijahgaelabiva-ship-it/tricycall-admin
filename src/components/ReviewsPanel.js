'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import Stars from '@/components/Stars'
import { fetchProfiles, formatDateTime } from '@/lib/adminData'

export default function ReviewsPanel({ driverId = null, onOpen }) {
  const [reviews, setReviews] = useState(null)
  const [profiles, setProfiles] = useState({})
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [starFilter, setStarFilter] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const base = () => {
          let q = supabase.from('ratings').select('*')
          if (driverId) q = q.eq('driver_id', driverId)
          return q
        }

        let res = await base().order('created_at', { ascending: false }).limit(300)
        // In case the ratings table has no created_at column
        if (res.error) res = await base().limit(300)
        if (res.error) throw res.error

        const rows = res.data || []
        const people = await fetchProfiles(rows.flatMap((r) => [r.driver_id, r.passenger_id]))

        if (!cancelled) {
          setReviews(rows)
          setProfiles(people)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message?.includes('permission')
              ? 'The admin account cannot read ratings yet. Run admin-access.sql in Supabase.'
              : err.message || 'Could not load reviews.'
          )
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [driverId])

  const summary = useMemo(() => {
    if (!reviews || reviews.length === 0) return null
    const avg = reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
    return { avg, count: reviews.length }
  }, [reviews])

  const byDriver = useMemo(() => {
    if (!reviews) return []
    const groups = {}
    for (const r of reviews) {
      if (!groups[r.driver_id]) groups[r.driver_id] = { id: r.driver_id, total: 0, count: 0 }
      groups[r.driver_id].total += Number(r.rating)
      groups[r.driver_id].count += 1
    }
    return Object.values(groups)
      .map((g) => ({ ...g, avg: g.total / g.count }))
      .sort((a, b) => b.avg - a.avg || b.count - a.count)
  }, [reviews])

  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!reviews) return <p className="text-gray-500 text-sm">Loading...</p>
  if (reviews.length === 0) {
    return <p className="text-gray-400 text-sm">No reviews yet.</p>
  }

  const visible = reviews.filter((r) => !starFilter || Math.round(Number(r.rating)) === starFilter)

  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3">
        <p className="text-3xl font-bold text-green-700">{summary.avg.toFixed(1)}</p>
        <div>
          <Stars value={summary.avg} size={18} />
          <p className="text-xs text-gray-500">
            {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
            {summary.count >= 300 ? ' (latest 300)' : ''}
          </p>
        </div>
      </div>

      {!driverId && (
        <div className="mt-3 flex gap-2">
          {[
            ['all', 'All reviews'],
            ['drivers', 'By driver'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                tab === key ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'drivers' && !driverId ? (
        <div className="mt-3 space-y-2">
          {byDriver.map((g) => {
            const p = profiles[g.id]
            return (
              <button
                key={g.id}
                onClick={() => onOpen({ type: 'driver', id: g.id })}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50"
              >
                <Avatar url={p?.avatar_url} name={p?.full_name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-green-700 truncate">{p?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">
                    {g.count} {g.count === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{g.avg.toFixed(1)}</p>
                  <Stars value={g.avg} size={13} />
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {[0, 5, 4, 3, 2, 1].map((n) => (
              <button
                key={n}
                onClick={() => setStarFilter(n)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  starFilter === n ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {n === 0 ? 'All' : `${n} ★`}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {visible.length === 0 && (
              <p className="text-sm text-gray-400">No reviews with that rating.</p>
            )}

            {visible.map((r) => {
              const passenger = profiles[r.passenger_id]
              const driver = profiles[r.driver_id]

              return (
                <div key={r.id || `${r.trip_id}-${r.passenger_id}`} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <Stars value={r.rating} size={16} />
                    <span className="text-xs text-gray-400">{formatDateTime(r.created_at)}</span>
                  </div>

                  <p className={`mt-2 text-sm ${r.comment ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                    {r.comment || 'No comment'}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      Passenger:{' '}
                      <button
                        onClick={() => onOpen({ type: 'passenger', id: r.passenger_id })}
                        className="font-semibold text-green-700 hover:underline"
                      >
                        {passenger?.full_name || 'Unknown'}
                      </button>
                    </span>
                    {!driverId && (
                      <span>
                        Driver:{' '}
                        <button
                          onClick={() => onOpen({ type: 'driver', id: r.driver_id })}
                          className="font-semibold text-green-700 hover:underline"
                        >
                          {driver?.full_name || 'Unknown'}
                        </button>
                      </span>
                    )}
                    {r.trip_id && (
                      <button
                        onClick={() => onOpen({ type: 'trip', id: r.trip_id })}
                        className="font-semibold text-gray-600 hover:underline"
                      >
                        View trip
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
