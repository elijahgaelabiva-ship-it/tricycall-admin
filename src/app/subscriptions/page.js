'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAdminGuard } from '@/lib/useAdminGuard'
import Avatar from '@/components/Avatar'
import RecordPaymentModal from '@/components/RecordPaymentModal'
import { fetchProfiles, formatDate, manilaToday, subscriptionStatus } from '@/lib/adminData'

const FILTERS = [
  ['all', 'All'],
  ['expired', 'Expired'],
  ['soon', 'Ending soon'],
  ['active', 'Active'],
  ['none', 'No payment'],
]

export default function SubscriptionsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  // settings form
  const [form, setForm] = useState({ required: false, monthly_fee: '', grace_days: '3', payment_instructions: '' })
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // free period
  const [freeUntil, setFreeUntil] = useState('')
  const [freeMessage, setFreeMessage] = useState('')

  // record payment
  const [payDriver, setPayDriver] = useState(null)

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') {
      router.push('/login')
      return
    }

    const [settingsRes, driversRes] = await Promise.all([
      supabase.from('subscription_settings').select('*').eq('id', 1).maybeSingle(),
      supabase
        .from('drivers')
        .select('id, is_online, is_approved, paid_until')
        .eq('is_approved', true),
    ])

    if (settingsRes.error || !settingsRes.data) {
      setError('Subscriptions are not set up yet. Run driver-subscription.sql in Supabase.')
      setLoading(false)
      return
    }

    const profiles = await fetchProfiles((driversRes.data || []).map((d) => d.id))
    const list = (driversRes.data || [])
      .map((d) => ({ ...d, profile: profiles[d.id] || null }))
      .sort((a, b) => (a.profile?.full_name || '').localeCompare(b.profile?.full_name || ''))

    setSettings(settingsRes.data)
    setForm({
      required: settingsRes.data.required,
      monthly_fee: String(settingsRes.data.monthly_fee ?? ''),
      grace_days: String(settingsRes.data.grace_days ?? 3),
      payment_instructions: settingsRes.data.payment_instructions || '',
    })
    setDrivers(list)
    setLoading(false)
  }

  const allowed = useAdminGuard('subscriptions')

  useEffect(() => {
    if (allowed) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed])

  const saveSettings = async () => {
    setSaving(true)
    setSaveMessage('')

    const { error: updateError } = await supabase
      .from('subscription_settings')
      .update({
        required: form.required,
        monthly_fee: Number(form.monthly_fee || 0),
        grace_days: Number(form.grace_days || 0),
        payment_instructions: form.payment_instructions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    setSaving(false)
    if (updateError) {
      setSaveMessage('Could not save: ' + updateError.message)
      return
    }
    setSaveMessage('Saved.')
    load()
  }

  const grantFreePeriod = async () => {
    if (!freeUntil) {
      setFreeMessage('Pick the date the free period ends.')
      return
    }
    const ok = window.confirm(
      `Give every approved driver without a later date a free subscription until ${formatDate(freeUntil)}?`
    )
    if (!ok) return

    const { data, error: rpcError } = await supabase.rpc('grant_free_period', { p_until: freeUntil })
    if (rpcError) {
      setFreeMessage('Could not do this: ' + rpcError.message)
      return
    }
    setFreeMessage(`${data} driver${data === 1 ? '' : 's'} updated.`)
    load()
  }

  const rows = useMemo(
    () =>
      drivers.map((d) => ({
        ...d,
        status: subscriptionStatus(d.paid_until, settings),
      })),
    [drivers, settings]
  )

  const counts = useMemo(() => {
    const c = { all: rows.length, expired: 0, soon: 0, active: 0, none: 0 }
    for (const r of rows) {
      if (r.status.key === 'expired' || r.status.key === 'grace') c.expired += 1
      else if (r.status.key === 'soon') c.soon += 1
      else if (r.status.key === 'active') c.active += 1
      else if (r.status.key === 'none') c.none += 1
    }
    return c
  }, [rows])

  const visible = rows.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'expired') return r.status.key === 'expired' || r.status.key === 'grace'
    return r.status.key === filter
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading subscriptions...</p>
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

      <h1 className="text-2xl font-bold text-green-600 text-center mb-6">Driver Subscriptions</h1>

      {error ? (
        <p className="max-w-md mx-auto text-center text-red-600 text-sm">{error}</p>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Settings */}
          <div className="border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-800">Settings</h2>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) => setForm({ ...form, required: e.target.checked })}
                className="mt-1 h-5 w-5"
              />
              <span>
                <span className="font-semibold text-gray-800">Require a subscription</span>
                <span className="block text-sm text-gray-500">
                  When on, drivers without a valid paid-until date can&apos;t go online, receive or
                  accept requests. Record payments or give a free period first, so nobody is locked
                  out by accident.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Monthly fee (₱)</label>
                <input
                  type="number"
                  min="0"
                  value={form.monthly_fee}
                  onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Grace days after expiry</label>
                <input
                  type="number"
                  min="0"
                  value={form.grace_days}
                  onChange={(e) => setForm({ ...form, grace_days: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">How drivers pay (shown to them when expired)</label>
              <textarea
                rows={3}
                value={form.payment_instructions}
                onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })}
                placeholder="e.g. GCash 09XX XXX XXXX (Name), or pay in cash at [office address]."
                className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1"
              />
            </div>

            {saveMessage && <p className="text-sm text-green-700">{saveMessage}</p>}

            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>

          {/* Free period */}
          <div className="border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-800">Free period for all drivers</h2>
            <p className="text-sm text-gray-500">
              Use this for a pilot or launch month. It sets every approved driver&apos;s paid-until
              date to the day you pick, unless they already have a later date.
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                min={manilaToday()}
                value={freeUntil}
                onChange={(e) => setFreeUntil(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2"
              />
              <button
                onClick={grantFreePeriod}
                className="border border-gray-300 rounded-xl px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Apply
              </button>
            </div>
            {freeMessage && <p className="text-sm text-green-700">{freeMessage}</p>}
          </div>

          {/* Drivers */}
          <div>
            <h2 className="font-bold text-gray-800 mb-2">Drivers</h2>

            <div className="flex flex-wrap gap-2 mb-3">
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    filter === key ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label} ({counts[key]})
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="text-sm text-gray-400">No drivers in this group.</p>
            ) : (
              <div className="space-y-2">
                {visible.map((d) => (
                  <div
                    key={d.id}
                    className="border border-gray-100 rounded-xl p-3 flex items-center gap-3"
                  >
                    <Avatar url={d.profile?.avatar_url} name={d.profile?.full_name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate">
                        {d.profile?.full_name || 'Unknown'}
                      </p>
                      {d.paid_until && (
                        <p className="text-xs text-gray-500">
                          Paid until {formatDate(d.paid_until)}
                        </p>
                      )}
                      <span
                        className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${d.status.className}`}
                      >
                        {d.status.label}
                      </span>
                    </div>
                    <button
                      onClick={() => setPayDriver(d)}
                      className="shrink-0 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-green-700"
                    >
                      Record payment
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {payDriver && (
        <RecordPaymentModal
          driver={payDriver}
          settings={settings}
          onClose={() => setPayDriver(null)}
          onDone={() => {
            setPayDriver(null)
            load()
          }}
        />
      )}
    </div>
  )
}
