'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchProfiles, formatDateTime } from '@/lib/adminData'

export default function ComplaintsPanel({ onOpen, onChanged }) {
  const [reports, setReports] = useState(null)
  const [tripsById, setTripsById] = useState({})
  const [profiles, setProfiles] = useState({})
  const [filter, setFilter] = useState('open')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        let res = await supabase
          .from('trip_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
        if (res.error) res = await supabase.from('trip_reports').select('*').limit(200)
        if (res.error) throw res.error

        const rows = res.data || []
        const tripIds = [...new Set(rows.map((r) => r.trip_id).filter(Boolean))]

        let trips = {}
        if (tripIds.length > 0) {
          const { data } = await supabase
            .from('trips')
            .select('id, driver_id, status')
            .in('id', tripIds)
          trips = Object.fromEntries((data || []).map((t) => [t.id, t]))
        }

        const people = await fetchProfiles([
          ...rows.map((r) => r.passenger_id),
          ...Object.values(trips).map((t) => t.driver_id),
        ])

        if (!cancelled) {
          setReports(rows)
          setTripsById(trips)
          setProfiles(people)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message?.includes('permission') || err.message?.includes('does not exist')
              ? 'Complaints are not set up yet. Run trip-reports.sql and admin-access.sql in Supabase.'
              : err.message || 'Could not load complaints.'
          )
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const setResolved = async (report, resolved) => {
    setBusyId(report.id)
    setActionError('')

    const { error: updateError } = await supabase
      .from('trip_reports')
      .update({ resolved })
      .eq('id', report.id)

    setBusyId(null)

    if (updateError) {
      setActionError('Could not update this complaint: ' + updateError.message)
      return
    }

    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, resolved } : r)))
    if (onChanged) onChanged()
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!reports) return <p className="text-gray-500 text-sm">Loading...</p>

  const openCount = reports.filter((r) => !r.resolved).length
  const visible = reports.filter((r) =>
    filter === 'all' ? true : filter === 'open' ? !r.resolved : r.resolved
  )

  return (
    <div>
      <div className="flex gap-2">
        {[
          ['open', `Open (${openCount})`],
          ['resolved', 'Resolved'],
          ['all', 'All'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              filter === key ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}

      <div className="mt-3 space-y-3">
        {visible.length === 0 && (
          <p className="text-sm text-gray-400">
            {filter === 'open' ? 'No open complaints.' : 'No complaints found.'}
          </p>
        )}

        {visible.map((r) => {
          const trip = tripsById[r.trip_id]
          const passenger = profiles[r.passenger_id]
          const driver = trip ? profiles[trip.driver_id] : null
          const unsafe = /unsafe/i.test(r.category || '')

          return (
            <div
              key={r.id}
              className={`rounded-xl border p-3 ${
                r.resolved ? 'border-gray-100 bg-gray-50' : unsafe ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-gray-800">{r.category}</p>
                <span
                  className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    r.resolved ? 'bg-green-100 text-green-700' : 'bg-white text-red-600'
                  }`}
                >
                  {r.resolved ? 'Resolved' : 'Open'}
                </span>
              </div>

              {r.details ? (
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{r.details}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-400 italic">No details added</p>
              )}

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>
                  Passenger:{' '}
                  <button
                    onClick={() => onOpen({ type: 'passenger', id: r.passenger_id })}
                    className="font-semibold text-green-700 hover:underline"
                  >
                    {passenger?.full_name || 'Unknown'}
                  </button>
                </span>
                <span>
                  Driver:{' '}
                  {trip?.driver_id ? (
                    <button
                      onClick={() => onOpen({ type: 'driver', id: trip.driver_id })}
                      className="font-semibold text-green-700 hover:underline"
                    >
                      {driver?.full_name || 'Unknown'}
                    </button>
                  ) : (
                    '—'
                  )}
                </span>
                <span>{formatDateTime(r.created_at)}</span>
              </div>

              <div className="mt-3 flex gap-2">
                {r.trip_id && (
                  <button
                    onClick={() => onOpen({ type: 'trip', id: r.trip_id })}
                    className="flex-1 rounded-lg border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    View trip
                  </button>
                )}
                <button
                  onClick={() => setResolved(r, !r.resolved)}
                  disabled={busyId === r.id}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold disabled:opacity-50 ${
                    r.resolved
                      ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {busyId === r.id ? 'Saving...' : r.resolved ? 'Reopen' : 'Mark resolved'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
