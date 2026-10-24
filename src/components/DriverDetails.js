'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import Stars from '@/components/Stars'
import DetailRow from '@/components/DetailRow'
import { formatDate, money, subscriptionStatus } from '@/lib/adminData'

export default function DriverDetails({ id, onOpen }) {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [driverRes, profileRes, vehicleRes, ratingsRes, completedRes, cancelledRes, settingsRes] =
          await Promise.all([
            supabase.from('drivers').select('*').eq('id', id).maybeSingle(),
            supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
            supabase.from('vehicles').select('*').eq('driver_id', id).limit(1),
            supabase.from('ratings').select('rating').eq('driver_id', id),
            supabase.from('trips').select('fare').eq('driver_id', id).eq('status', 'completed'),
            supabase
              .from('trips')
              .select('*', { count: 'exact', head: true })
              .eq('driver_id', id)
              .eq('status', 'cancelled'),
            supabase.from('subscription_settings').select('*').eq('id', 1).maybeSingle(),
          ])

        if (driverRes.error) throw driverRes.error
        if (cancelled) return

        const ratings = ratingsRes.data || []
        const completed = completedRes.data || []

        setInfo({
          driver: driverRes.data,
          profile: profileRes.data,
          vehicle: (vehicleRes.data || [])[0] || null,
          ratingCount: ratings.length,
          ratingAvg:
            ratings.length > 0
              ? ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length
              : null,
          completedCount: completed.length,
          earned: completed.reduce((sum, t) => sum + Number(t.fare || 0), 0),
          cancelledCount: cancelledRes.count || 0,
          settings: settingsRes.data || null,
        })
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load driver details.')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!info) return <p className="text-gray-500 text-sm">Loading...</p>

  const { driver, profile, vehicle } = info
  if (!driver) return <p className="text-gray-500 text-sm">Driver not found.</p>

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <Avatar url={profile?.avatar_url} name={profile?.full_name} size={112} />
        <h3 className="mt-3 text-xl font-bold text-gray-800">
          {profile?.full_name || 'Unknown driver'}
        </h3>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              driver.is_approved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
            }`}
          >
            {driver.is_approved ? 'Approved' : 'Pending approval'}
          </span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              driver.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {driver.is_online ? 'Online' : 'Offline'}
          </span>
          {driver.is_suspended && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
              Suspended
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm">
          {info.ratingCount > 0 ? (
            <>
              <Stars value={info.ratingAvg} size={18} />
              <span className="font-semibold text-gray-700">{info.ratingAvg.toFixed(1)}</span>
              <span className="text-gray-400">
                ({info.ratingCount} {info.ratingCount === 1 ? 'review' : 'reviews'})
              </span>
            </>
          ) : (
            <span className="text-gray-400">No reviews yet</span>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 px-4">
        <DetailRow label="Phone">{profile?.phone || '—'}</DetailRow>
        <DetailRow label="License number">{driver.license_number || '—'}</DetailRow>
        <DetailRow label="Vehicle">
          {vehicle ? `${vehicle.model || '—'}${vehicle.color ? `, ${vehicle.color}` : ''}` : '—'}
        </DetailRow>
        <DetailRow label="Plate number">{vehicle?.plate_number || '—'}</DetailRow>
        <DetailRow label="Registered">{formatDate(driver.created_at || profile?.created_at)}</DetailRow>
        {info.settings && (
          <DetailRow label="Subscription">
            {driver.paid_until ? `Paid until ${formatDate(driver.paid_until)}` : 'No payment yet'}
            {(() => {
              const status = subscriptionStatus(driver.paid_until, info.settings)
              return (
                <span
                  className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${status.className}`}
                >
                  {info.settings.required ? status.label : 'Not required yet'}
                </span>
              )
            })()}
          </DetailRow>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xl font-bold text-green-700">{info.completedCount}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xl font-bold text-red-500">{info.cancelledCount}</p>
          <p className="text-xs text-gray-500">Cancelled</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-lg font-bold text-gray-800">{money(info.earned)}</p>
          <p className="text-xs text-gray-500">Earned</p>
        </div>
      </div>

      <button
        onClick={() => onOpen({ type: 'driverReviews', id })}
        className="mt-4 w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        View this driver&apos;s reviews
      </button>
    </div>
  )
}
