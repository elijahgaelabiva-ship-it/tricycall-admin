'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAdminGuard } from '@/lib/useAdminGuard'
import RecordPaymentModal from '@/components/RecordPaymentModal'
import { formatDate, hasPaid } from '@/lib/adminData'

const FILTERS = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['photos', 'New photos'],
]

export default function ManageDriversPage() {
  const [drivers, setDrivers] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [message, setMessage] = useState('')
  // Opens on the right tab when coming from the dashboard notification
  const [filter, setFilter] = useState(() => {
    if (typeof window === 'undefined') return 'all'
    const f = new URLSearchParams(window.location.search).get('filter')
    return f === 'pending' || f === 'photos' ? f : 'all'
  })
  const [payDriver, setPayDriver] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(null)
  const router = useRouter()

  const allowed = useAdminGuard('drivers')

  useEffect(() => {
    if (allowed) loadDrivers()
  }, [allowed])

  const loadDrivers = async () => {
    const [driversRes, vehiclesRes, settingsRes] = await Promise.all([
      supabase
        .from('drivers')
        .select('*, profiles(full_name, phone, avatar_url, pending_avatar_at)')
        .order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*'),
      supabase.from('subscription_settings').select('*').eq('id', 1).maybeSingle(),
    ])

    const merged = (driversRes.data || []).map((driver) => ({
      ...driver,
      vehicle: vehiclesRes.data?.find((v) => v.driver_id === driver.id),
    }))

    setDrivers(merged)
    setSettings(settingsRes.data || null)
    setLoading(false)
  }

  const toggleApproval = async (driverId, currentStatus) => {
    setUpdating(driverId)
    setMessage('')

    // Approving requires a completed payment. Re-check the latest value from
    // the database so a stale screen can't approve an unpaid driver.
    if (!currentStatus) {
      const { data: latest } = await supabase
        .from('drivers')
        .select('paid_until')
        .eq('id', driverId)
        .maybeSingle()

      if (!hasPaid(latest?.paid_until)) {
        setMessage('This driver has not completed payment yet, so they were not approved.')
        setUpdating(null)
        loadDrivers()
        return
      }
    }

    const { error } = await supabase
      .from('drivers')
      .update({ is_approved: !currentStatus })
      .eq('id', driverId)

    if (error) {
      setMessage(error.message)
    } else {
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, is_approved: !currentStatus } : d))
      )
    }
    setUpdating(null)
  }

  const reviewPhoto = async (driverId, action) => {
    const ok = window.confirm(
      action === 'approve'
        ? 'Replace the driver\'s photo with the new one?'
        : 'Reject the new photo? The driver keeps the current photo.'
    )
    if (!ok) return
    setPhotoBusy(driverId)
    setMessage('')
    const { data: sess } = await supabase.auth.getSession()
    const res = await fetch('/api/driver-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sess.session?.access_token}`,
      },
      body: JSON.stringify({ driver_id: driverId, action }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setMessage(body.error || 'Could not update the photo.')
    }
    setPhotoBusy(null)
    loadDrivers()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading drivers...</p>
      </div>
    )
  }

  const pendingCount = drivers.filter((d) => !d.is_approved).length
  const photoCount = drivers.filter((d) => d.profiles?.pending_avatar_at).length
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  // Pending drivers first, then newest
  const visible = drivers
    .filter((d) => {
      if (filter === 'pending') return !d.is_approved
      if (filter === 'approved') return d.is_approved
      if (filter === 'photos') return Boolean(d.profiles?.pending_avatar_at)
      return true
    })
    .sort((a, b) => Number(a.is_approved) - Number(b.is_approved))

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <button
        onClick={() => router.push('/dashboard')}
        className="text-green-600 text-sm font-medium mb-4"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-green-600 text-center mb-4">Manage Drivers</h1>

      <div className="max-w-md mx-auto">
        <div className="flex gap-2 mb-4">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                filter === key ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {label}
              {key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
              {key === 'photos' && photoCount > 0 ? ` (${photoCount})` : ''}
            </button>
          ))}
        </div>

        {message && (
          <p className="mb-3 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-sm text-orange-700">
            {message}
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-center text-gray-400">No drivers here.</p>
      ) : (
        <div className="max-w-md mx-auto space-y-3">
          {visible.map((driver) => {
            const paid = hasPaid(driver.paid_until)
            const blocked = !driver.is_approved && !paid

            return (
              <div
                key={driver.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex gap-3"
              >
                {driver.profiles?.avatar_url ? (
                  <img
                    src={driver.profiles.avatar_url}
                    alt={driver.profiles?.full_name || 'Driver photo'}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl flex-shrink-0">
                    {driver.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">
                    {driver.profiles?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">{driver.profiles?.phone}</p>
                  <p className="text-sm text-gray-500">License: {driver.license_number}</p>
                  <p className="text-sm text-gray-500">
                    Vehicle: {driver.vehicle?.model || 'N/A'} ({driver.vehicle?.plate_number || 'N/A'})
                  </p>
                  <p className="text-sm mt-1">
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                        paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {paid ? `Paid until ${formatDate(driver.paid_until)}` : 'Payment not completed'}
                    </span>
                  </p>

                  <div className="flex justify-between items-center mt-3 gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        driver.is_approved ? 'text-green-600' : 'text-orange-500'
                      }`}
                    >
                      {driver.is_approved ? 'Approved' : 'Pending'}
                    </span>

                    <div className="flex gap-2">
                      {blocked && (
                        <button
                          onClick={() =>
                            setPayDriver({
                              id: driver.id,
                              paid_until: driver.paid_until,
                              profile: driver.profiles,
                            })
                          }
                          className="text-sm font-semibold px-3 py-2 rounded-lg border border-green-600 text-green-700 hover:bg-green-50"
                        >
                          Record payment
                        </button>
                      )}
                      <button
                        onClick={() => toggleApproval(driver.id, driver.is_approved)}
                        disabled={updating === driver.id || blocked}
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
                          : blocked
                          ? 'On hold'
                          : 'Approve'}
                      </button>
                    </div>
                  </div>

                  {blocked && (
                    <p className="mt-2 text-xs text-orange-600">
                      On hold until payment is completed.
                    </p>
                  )}

                  {driver.profiles?.pending_avatar_at && (
                    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                      <p className="text-sm font-semibold text-gray-800">
                        New photo waiting for approval
                      </p>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="text-center">
                          {driver.profiles?.avatar_url ? (
                            <img
                              src={driver.profiles.avatar_url}
                              alt="Current photo"
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-gray-100" />
                          )}
                          <p className="text-xs text-gray-500 mt-1">Current</p>
                        </div>
                        <div className="text-center">
                          <img
                            src={`${supabaseUrl}/storage/v1/object/public/avatars/${driver.id}/pending.jpg?t=${encodeURIComponent(
                              driver.profiles.pending_avatar_at
                            )}`}
                            alt="New photo"
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <p className="text-xs text-gray-500 mt-1">New</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => reviewPhoto(driver.id, 'approve')}
                          disabled={photoBusy === driver.id}
                          className="flex-1 text-sm font-semibold py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve photo
                        </button>
                        <button
                          onClick={() => reviewPhoto(driver.id, 'reject')}
                          disabled={photoBusy === driver.id}
                          className="flex-1 text-sm font-semibold py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {payDriver && (
        <RecordPaymentModal
          driver={payDriver}
          settings={settings}
          onClose={() => setPayDriver(null)}
          onDone={() => {
            setPayDriver(null)
            loadDrivers()
          }}
        />
      )}
    </div>
  )
}
