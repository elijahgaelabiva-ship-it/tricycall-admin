'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeCard, setActiveCard] = useState(null)
  const [detailItems, setDetailItems] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const loadStats = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/login')
        return
      }

      const [
        { count: totalDrivers },
        { count: activeDrivers },
        { count: totalPassengers },
        { count: activeTrips },
        { count: completedTrips },
        { count: cancelledTrips },
      ] = await Promise.all([
        supabase.from('drivers').select('*', { count: 'exact', head: true }),
        supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'passenger'),
        supabase.from('trips').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'arrived', 'ongoing']),
        supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      ])

      setStats({
        totalDrivers,
        activeDrivers,
        totalPassengers,
        activeTrips,
        completedTrips,
        cancelledTrips,
      })
      setLoading(false)
    }

    loadStats()
  }, [router])

  // Given rows that have an id referencing profiles(id), attach full_name/phone
  const attachProfileInfo = async (rows, idField = 'id') => {
    const ids = [...new Set(rows.map((r) => r[idField]).filter(Boolean))]
    if (ids.length === 0) return rows

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', ids)

    const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    return rows.map((r) => ({ ...r, profile: byId[r[idField]] || null }))
  }

  const loadCardDetails = async (cardKey) => {
    setActiveCard(cardKey)
    setDetailLoading(true)
    setDetailError('')
    setDetailItems([])

    try {
      if (cardKey === 'totalDrivers' || cardKey === 'activeDrivers') {
        let query = supabase
          .from('drivers')
          .select('id, is_online, is_approved')
          .order('is_online', { ascending: false })

        if (cardKey === 'activeDrivers') query = query.eq('is_online', true)

        const { data, error } = await query
        if (error) throw error

        const withProfiles = await attachProfileInfo(data || [], 'id')
        setDetailItems(withProfiles)
      } else if (cardKey === 'totalPassengers') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, phone, created_at')
          .eq('role', 'passenger')
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) throw error
        setDetailItems(data || [])
      } else if (
        cardKey === 'activeTrips' ||
        cardKey === 'completedTrips' ||
        cardKey === 'cancelledTrips'
      ) {
        const statusFilter =
          cardKey === 'activeTrips'
            ? ['accepted', 'arrived', 'ongoing']
            : cardKey === 'completedTrips'
            ? ['completed']
            : ['cancelled']

        const { data, error } = await supabase
          .from('trips')
          .select('id, passenger_id, driver_id, status, fare, distance_km, requested_at')
          .in('status', statusFilter)
          .order('requested_at', { ascending: false })
          .limit(100)

        if (error) throw error

        const withPassengers = await attachProfileInfo(data || [], 'passenger_id')
        setDetailItems(withPassengers)
      }
    } catch (err) {
      setDetailError(err.message || 'Failed to load details.')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetails = () => {
    setActiveCard(null)
    setDetailItems([])
    setDetailError('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    )
  }

  const cards = [
    { key: 'totalDrivers', label: 'Total Drivers', value: stats.totalDrivers },
    { key: 'activeDrivers', label: 'Active Drivers', value: stats.activeDrivers },
    { key: 'totalPassengers', label: 'Passengers', value: stats.totalPassengers },
    { key: 'activeTrips', label: 'Active Trips', value: stats.activeTrips },
    { key: 'completedTrips', label: 'Completed Trips', value: stats.completedTrips },
    { key: 'cancelledTrips', label: 'Cancelled Trips', value: stats.cancelledTrips },
  ]

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <h1 className="text-2xl font-bold text-green-600 text-center mb-2">
        Admin Dashboard
      </h1>
      <p className="text-center text-gray-500 mb-8">TRICYCALL.SF</p>

      <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4 mb-8">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => loadCardDetails(card.key)}
            className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md hover:border-green-300 transition cursor-pointer"
          >
            <p className="text-3xl font-bold text-green-700">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto flex flex-col gap-3">
        <button
          onClick={() => router.push('/drivers')}
          className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold hover:bg-green-700 transition"
        >
          Manage Drivers
        </button>
        <button
          onClick={() => router.push('/trips')}
          className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-50 transition"
        >
          View All Trips
        </button>
        <button
          onClick={() => router.push('/fares')}
          className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-50 transition"
        >
          Fare Settings
        </button>
      </div>

      {activeCard && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 px-4"
          style={{ zIndex: 9999 }}
          onClick={closeDetails}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">
                {cards.find((c) => c.key === activeCard)?.label}
              </h2>
              <button
                onClick={closeDetails}
                className="text-gray-400 text-2xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2">
              {detailLoading && <p className="text-gray-500 text-sm">Loading...</p>}

              {detailError && (
                <p className="text-red-600 text-sm">{detailError}</p>
              )}

              {!detailLoading && !detailError && detailItems.length === 0 && (
                <p className="text-gray-400 text-sm">No records found.</p>
              )}

              {!detailLoading &&
                (activeCard === 'totalDrivers' || activeCard === 'activeDrivers') &&
                detailItems.map((d) => (
                  <div
                    key={d.id}
                    className="border border-gray-100 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {d.profile?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{d.profile?.phone}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        d.is_online
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {d.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ))}

              {!detailLoading &&
                activeCard === 'totalPassengers' &&
                detailItems.map((p) => (
                  <div key={p.id} className="border border-gray-100 rounded-xl p-3">
                    <p className="font-semibold text-gray-800">{p.full_name}</p>
                    <p className="text-xs text-gray-500">{p.phone}</p>
                  </div>
                ))}

              {!detailLoading &&
                (activeCard === 'activeTrips' ||
                  activeCard === 'completedTrips' ||
                  activeCard === 'cancelledTrips') &&
                detailItems.map((t) => (
                  <div key={t.id} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800">
                        {t.profile?.full_name || 'Unknown passenger'}
                      </p>
                      <p className="text-sm font-semibold text-green-700">
                        ₱{Number(t.fare).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {Number(t.distance_km).toFixed(2)} km &middot;{' '}
                      {new Date(t.requested_at).toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}