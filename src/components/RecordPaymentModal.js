'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, formatDateTime, money } from '@/lib/adminData'

export default function RecordPaymentModal({ driver, settings, onClose, onDone }) {
  const fee = Number(settings?.monthly_fee || 0)
  const [months, setMonths] = useState(1)
  const [amount, setAmount] = useState(fee ? String(fee) : '')
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('subscription_payments')
      .select('*')
      .eq('driver_id', driver.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!cancelled) setHistory(data || [])
      })
    return () => {
      cancelled = true
    }
  }, [driver.id])

  const changeMonths = (value) => {
    setMonths(value)
    if (fee) setAmount(String(fee * value))
  }

  const submit = async () => {
    setSaving(true)
    setError('')

    const { error: rpcError } = await supabase.rpc('record_driver_payment', {
      p_driver: driver.id,
      p_months: Number(months),
      p_amount: Number(amount || 0),
      p_method: method,
      p_note: note.trim() || null,
    })

    setSaving(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    onDone()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 px-3"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-800">Record payment</h3>
            <p className="text-sm text-gray-500">{driver.profile?.full_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-600">
          {driver.paid_until ? `Currently paid until ${formatDate(driver.paid_until)}.` : 'No payment recorded yet.'}{' '}
          The new date is counted from the later of today and the current date.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Months</label>
            <select
              value={months}
              onChange={(e) => changeMonths(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1"
            >
              {[1, 2, 3, 6, 12].map((m) => (
                <option key={m} value={m}>
                  {m} {m === 1 ? 'month' : 'months'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Amount received (₱)</label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-sm text-gray-600">Paid by</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1"
          >
            <option value="cash">Cash</option>
            <option value="gcash">GCash</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mt-3">
          <label className="text-sm text-gray-600">Note (optional, e.g. receipt number)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={submit}
          disabled={saving}
          className="mt-4 w-full bg-green-600 text-white rounded-xl py-3 font-semibold hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save payment'}
        </button>

        <h4 className="mt-5 text-sm font-bold text-gray-800">Recent payments</h4>
        {history === null ? (
          <p className="text-sm text-gray-400 mt-1">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-400 mt-1">None yet.</p>
        ) : (
          <div className="mt-1 divide-y divide-gray-100">
            {history.map((h) => (
              <div key={h.id} className="py-2 text-sm flex justify-between gap-3">
                <span className="text-gray-600">
                  {formatDateTime(h.created_at)} &middot; {h.months} {h.months === 1 ? 'month' : 'months'} &middot; {h.method}
                </span>
                <span className="font-semibold text-gray-800">{money(h.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
