import { supabase } from '@/lib/supabase'

// id -> { id, full_name, phone, avatar_url }
export async function fetchProfiles(ids) {
  const unique = [...new Set((ids || []).filter(Boolean))]
  if (unique.length === 0) return {}

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, phone, avatar_url')
    .in('id', unique)

  return Object.fromEntries((data || []).map((p) => [p.id, p]))
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function money(value) {
  return `₱${Number(value || 0).toFixed(2)}`
}

export function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export const STATUS_STYLES = {
  requested: { label: 'Requested', className: 'bg-gray-100 text-gray-600' },
  accepted: { label: 'Driver on the way', className: 'bg-blue-100 text-blue-700' },
  arrived: { label: 'Driver arrived', className: 'bg-blue-100 text-blue-700' },
  ongoing: { label: 'In progress', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
}

// Why was a trip cancelled? Uses the cancelled_by / cancel_reason columns that
// trip-cancellations.sql starts recording. Older trips don't have them.
export function cancellationInfo(trip) {
  if (trip.cancelled_by === 'passenger') {
    return {
      label: 'Passenger cancelled',
      detail:
        trip.cancel_reason === 'passenger_after_accept'
          ? 'The passenger cancelled after a driver had accepted the trip.'
          : 'The passenger cancelled before any driver accepted.',
      tone: 'text-red-600 bg-red-50',
    }
  }

  if (trip.cancelled_by === 'driver') {
    return trip.cancel_reason === 'no_show'
      ? {
          label: 'Passenger no-show',
          detail: 'The driver arrived at the pickup point and reported that the passenger did not show up.',
          tone: 'text-orange-700 bg-orange-50',
        }
      : {
          label: 'Cancelled by driver',
          detail: 'The driver cancelled this trip.',
          tone: 'text-orange-700 bg-orange-50',
        }
  }

  if (trip.cancelled_by === 'system') {
    return {
      label: 'Auto-cancelled',
      detail: 'Cancelled automatically (no driver accepted in time, or the trip was left open too long).',
      tone: 'text-gray-700 bg-gray-100',
    }
  }

  return {
    label: 'Cancelled (reason not recorded)',
    detail: trip.driver_id
      ? 'A driver had accepted this trip. Who cancelled it was not recorded for older trips.'
      : 'No driver had accepted this trip. Who cancelled it was not recorded for older trips.',
    tone: 'text-gray-700 bg-gray-100',
  }
}

// Today's date in the Philippines as YYYY-MM-DD
export function manilaToday() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// Subscription status for a driver. `settings` is the subscription_settings row.
export function subscriptionStatus(paidUntil, settings) {
  const graceDays = Number(settings?.grace_days || 0)

  if (!paidUntil) {
    return { key: 'none', label: 'No payment yet', className: 'bg-gray-100 text-gray-600', daysLeft: null }
  }

  const daysLeft = Math.round((Date.parse(paidUntil) - Date.parse(manilaToday())) / 86400000)

  if (daysLeft >= 0) {
    return daysLeft <= 7
      ? {
          key: 'soon',
          label: daysLeft === 0 ? 'Ends today' : `Ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`,
          className: 'bg-yellow-100 text-yellow-700',
          daysLeft,
        }
      : { key: 'active', label: 'Active', className: 'bg-green-100 text-green-700', daysLeft }
  }

  if (-daysLeft <= graceDays) {
    return { key: 'grace', label: 'Grace period', className: 'bg-orange-100 text-orange-700', daysLeft }
  }

  return { key: 'expired', label: 'Expired', className: 'bg-red-100 text-red-600', daysLeft }
}
