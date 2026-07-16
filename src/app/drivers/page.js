'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ManageDriversPage() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const router = useRouter()

  useEffect(() => {
    loadDrivers()
  }, [])

  const loadDrivers = async () => {
    const { data: driversData } = await supabase
      .from('drivers')
      .select('*, profiles(full_name, phone)')
      .order('created_at', { ascending: false })

    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('*')

    const merged = (driversData || []).map((driver) => ({
      ...driver,
      vehicle: vehiclesData?.find((v) => v.driver_id === driver.id),
    }))

    setDrivers(merged)
    setLoading(false)
  }

  const toggleApproval = async (driverId, currentStatus) => {
    setUpdating(driverId)
    const { error } = await supabase
      .from('drivers')
      .update({ is_approved: !currentStatus })
      .eq('id', driverId)

    if (!error) {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === driverId ? { ...d, is_approved: !currentStatus } : d
        )
      )
    }
    setUpdating(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading drivers...</p>
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
        Manage Drivers
      </h1>

      {drivers.length === 0 ? (
        <p className="text-center text-gray-400">No drivers registered yet.</p>
      ) : (
        <div className="max-w-md mx-auto space-y-3">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <p className="font-semibold text-gray-800">
                {driver.profiles?.full_name || 'Unknown'}
              </p>
              <p className="text-sm text-gray-500">{driver.profiles?.phone}</p>
              <p className="text-sm text-gray-500">
                License: {driver.license_number}
              </p>
              <p className="text-sm text-gray-500">
                Vehicle: {driver.vehicle?.model || 'N/A'} ({driver.vehicle?.plate_number || 'N/A'})
              </p>
              <div className="flex justify-between items-center mt-3">
                <span
                  className={`text-sm font-semibold ${
                    driver.is_approved ? 'text-green-600' : 'text-orange-500'
                  }`}
                >
                  {driver.is_approved ? 'Approved' : 'Pending'}
                </span>
                <button
                  onClick={() => toggleApproval(driver.id, driver.is_approved)}
                  disabled={updating === driver.id}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 ${
                    driver.is_approved
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {updating === driver.id
                    ? 'Updating...'
                    : driver.is_approved
                    ? 'Suspend'
                    : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}