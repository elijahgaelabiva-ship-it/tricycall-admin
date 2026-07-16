'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminTripsPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadTrips = async () => {
      const { data } = await supabase
        .from('trips')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(50)

      setTrips(data || [])
      setLoading(false)
    }
    loadTrips()
  }, [])

  const statusColors = {
    requested: 'text-gray-500',
    accepted: 'text-blue-600',
    arrived: 'text-blue-600',
    ongoing: 'text-yellow-600',
    completed: 'text-green-600',
    cancelled: 'text-red-500',
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

      {trips.length === 0 ? (
        <p className="text-center text-gray-400">No trips yet.</p>
      ) : (
        <div className="max-w-md mx-auto space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-semibold capitalize ${statusColors[trip.status]}`}>
                  {trip.status}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(trip.requested_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Distance: {Number(trip.distance_km || 0).toFixed(2)} km
              </p>
              <p className="font-semibold text-green-700">
                ₱{Number(trip.fare || 0).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}