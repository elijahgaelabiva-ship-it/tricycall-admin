'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CardList from '@/components/CardList'
import DriverDetails from '@/components/DriverDetails'
import PassengerDetails from '@/components/PassengerDetails'
import TripDetails from '@/components/TripDetails'
import ReviewsPanel from '@/components/ReviewsPanel'
import ComplaintsPanel from '@/components/ComplaintsPanel'
import AdminPanel from '@/components/AdminPanel'

const CARD_LABELS = {
  totalDrivers: 'Total Drivers',
  activeDrivers: 'Active Drivers',
  totalPassengers: 'Passengers',
  activeTrips: 'Active Trips',
  completedTrips: 'Completed Trips',
  cancelledTrips: 'Cancelled Trips',
  reviews: 'Reviews',
  complaints: 'Complaints',
}

function viewTitle(view) {
  switch (view.type) {
    case 'list':
      return CARD_LABELS[view.key]
    case 'driver':
      return 'Driver details'
    case 'passenger':
      return 'Passenger profile'
    case 'trip':
      return 'Trip details'
    case 'driverReviews':
      return 'Driver reviews'
    default:
      return ''
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [perms, setPerms] = useState({})
  const [me, setMe] = useState({ email: '', role: '' })
  // Navigation inside the details window: list -> driver / passenger / trip ...
  const [stack, setStack] = useState([])
  const cacheRef = useRef({})
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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

      // Read role/permissions through the server (reliable)
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${sess.session?.access_token}` },
      })
      const meData = res.ok ? await res.json() : {}
      setMe({ email: user.email || '', role: meData.role || 'admin' })
      if (meData.role === 'owner') {
        setPerms({ complaints: true, drivers: true, trips_edit: true, subscriptions: true, fares: true })
      } else {
        setPerms(meData.permissions || {})
      }

      const [
        { count: totalDrivers },
        { count: activeDrivers },
        { count: totalPassengers },
        { count: activeTrips },
        { count: completedTrips },
        { count: cancelledTrips },
        { count: reviews },
        { count: complaints },
      ] = await Promise.all([
        supabase.from('drivers').select('*', { count: 'exact', head: true }),
        supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'passenger'),
        supabase.from('trips').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'arrived', 'ongoing']),
        supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('ratings').select('*', { count: 'exact', head: true }),
        // Open (unresolved) complaints
        supabase.from('trip_reports').select('*', { count: 'exact', head: true }).eq('resolved', false),
      ])

      setStats({
        totalDrivers,
        activeDrivers,
        totalPassengers,
        activeTrips,
        completedTrips,
        cancelledTrips,
        reviews,
        complaints,
      })
      setLoading(false)
    }

    loadStats()
  }, [router])

  const refreshComplaintCount = async () => {
    const { count } = await supabase
      .from('trip_reports')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false)
    setStats((prev) => (prev ? { ...prev, complaints: count } : prev))
  }

  const openCard = (key) => {
    cacheRef.current = {}
    setStack([{ type: 'list', key }])
  }
  const open = (view) => setStack((prev) => [...prev, view])
  const back = () => setStack((prev) => prev.slice(0, -1))
  const close = () => {
    setStack([])
    cacheRef.current = {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    )
  }

  const cards = Object.keys(CARD_LABELS).map((key) => ({
    key,
    label: CARD_LABELS[key],
    value: stats[key],
  }))

  const view = stack[stack.length - 1]

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      {/* Who is logged in + Log out */}
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 mb-6 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Logged in as</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{me.email}</p>
          <p className="text-xs font-semibold text-green-700 uppercase">{me.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 bg-red-600 text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-red-700 transition"
        >
          Log out
        </button>
      </div>

      <h1 className="text-2xl font-bold text-green-600 text-center mb-2">Admin Dashboard</h1>
      <p className="text-center text-gray-500 mb-8">TRICYCALL.SF</p>

      <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4 mb-8">
        {cards.map((card) => (
          <button
            key={card.key}
            onClick={() => openCard(card.key)}
            className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md hover:border-green-300 transition cursor-pointer"
          >
            <p
              className={`text-3xl font-bold ${
                card.key === 'complaints' && card.value > 0 ? 'text-red-600' : 'text-green-700'
              }`}
            >
              {card.value ?? '—'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {card.key === 'complaints' ? 'Open Complaints' : card.label}
            </p>
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto flex flex-col gap-3">
        {perms.drivers && (
          <button
            onClick={() => router.push('/drivers')}
            className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold hover:bg-green-700 transition"
          >
            Manage Drivers
          </button>
        )}
        <button
          onClick={() => router.push('/trips')}
          className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-50 transition"
        >
          View All Trips
        </button>
        {perms.subscriptions && (
          <button
            onClick={() => router.push('/subscriptions')}
            className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-50 transition"
          >
            Subscriptions
          </button>
        )}
        {perms.fares && (
          <button
            onClick={() => router.push('/fares')}
            className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-50 transition"
          >
            Fare Settings
          </button>
        )}
      </div>

      {/* Only visible to the owner; renders nothing for everyone else */}
      <div className="max-w-2xl mx-auto">
        <AdminPanel />
      </div>

      {view && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 px-3"
          style={{ zIndex: 9999 }}
          onClick={close}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 p-4 border-b border-gray-100">
              {stack.length > 1 && (
                <button
                  onClick={back}
                  className="text-green-700 font-semibold text-sm px-2 py-1 rounded-lg hover:bg-green-50"
                  aria-label="Back"
                >
                  &larr; Back
                </button>
              )}
              <h2 className="font-bold text-gray-800 flex-1 truncate">{viewTitle(view)}</h2>
              <button
                onClick={close}
                className="text-gray-400 text-2xl leading-none px-1"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex-1">
              {view.type === 'list' && view.key === 'reviews' && (
                <ReviewsPanel key="reviews" onOpen={open} />
              )}
              {view.type === 'list' && view.key === 'complaints' && (
                <ComplaintsPanel key="complaints" onOpen={open} onChanged={refreshComplaintCount} />
              )}
              {view.type === 'list' && view.key !== 'reviews' && view.key !== 'complaints' && (
                <CardList key={view.key} cardKey={view.key} onOpen={open} cache={cacheRef} />
              )}
              {view.type === 'driver' && <DriverDetails key={view.id} id={view.id} onOpen={open} />}
              {view.type === 'passenger' && (
                <PassengerDetails key={view.id} id={view.id} onOpen={open} />
              )}
              {view.type === 'trip' && <TripDetails key={view.id} id={view.id} onOpen={open} />}
              {view.type === 'driverReviews' && (
                <ReviewsPanel key={`dr-${view.id}`} driverId={view.id} onOpen={open} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
