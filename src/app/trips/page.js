'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAdminGuard } from '@/lib/useAdminGuard'

export default function FareSettingsPage() {
  const [fareId, setFareId] = useState(null)
  const [baseFare, setBaseFare] = useState('')
  const [perKmRate, setPerKmRate] = useState('')
  const [waitingFee, setWaitingFee] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const router = useRouter()

  const allowed = useAdminGuard('fares')

  useEffect(() => {
    if (!allowed) return
    const loadFares = async () => {
      const { data } = await supabase
        .from('fare_settings')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .single()

      if (data) {
        setFareId(data.id)
        setBaseFare(data.base_fare)
        setPerKmRate(data.per_km_rate)
        setWaitingFee(data.waiting_fee_per_min)
      }
      setLoading(false)
    }
    loadFares()
  }, [allowed])

  const saveFares = async () => {
    setSaved(false)
    setSaveError('')

    const base = Number(baseFare)
    const perKm = Number(perKmRate)
    const waiting = Number(waitingFee)
    if (
      [base, perKm, waiting].some((n) => !Number.isFinite(n) || n < 0) ||
      baseFare === '' ||
      perKmRate === ''
    ) {
      setSaveError('Enter valid amounts (0 or more) for the base fare and per-km rate.')
      return
    }
    if (base === 0 && perKm === 0) {
      setSaveError('Base fare and per-km rate cannot both be zero.')
      return
    }
    if (!fareId) {
      setSaveError('No fare settings row was found to update.')
      return
    }
    setSaving(true)

    const { error } = await supabase
      .from('fare_settings')
      .update({
        base_fare: base,
        per_km_rate: perKm,
        waiting_fee_per_min: waiting,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fareId)

    if (error) setSaveError('Could not save: ' + error.message)
    else setSaved(true)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading fare settings...</p>
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
        Fare Settings
      </h1>

      <div className="max-w-sm mx-auto bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <label className="text-sm text-gray-600">Base Fare (₱)</label>
          <input
            type="number"
            value={baseFare}
            onChange={(e) => setBaseFare(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Per Kilometer Rate (₱)</label>
          <input
            type="number"
            value={perKmRate}
            onChange={(e) => setPerKmRate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Waiting Fee (₱/min)</label>
          <input
            type="number"
            value={waitingFee}
            onChange={(e) => setWaitingFee(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1"
          />
        </div>

        {saved && (
          <p className="text-green-600 text-sm text-center">
            Fare settings updated!
          </p>
        )}

        {saveError && (
          <p className="text-red-600 text-sm text-center">{saveError}</p>
        )}

        <button
          onClick={saveFares}
          disabled={saving}
          className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
