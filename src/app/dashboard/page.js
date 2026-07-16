'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    )
  }

  const cards = [
    { label: 'Total Drivers', value: stats.totalDrivers },
    { label: 'Active Drivers', value: stats.activeDrivers },
    { label: 'Passengers', value: stats.totalPassengers },
    { label: 'Active Trips', value: stats.activeTrips },
    { label: 'Completed Trips', value: stats.completedTrips },
    { label: 'Cancelled Trips', value: stats.cancelledTrips },
  ]

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <h1 className="text-2xl font-bold text-green-600 text-center mb-2">
        Admin Dashboard
      </h1>
      <p className="text-center text-gray-500 mb-8">TRICYCALL.SF</p>

      <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-sm"
          >
            <p className="text-3xl font-bold text-green-700">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
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
    </div>
  )
}