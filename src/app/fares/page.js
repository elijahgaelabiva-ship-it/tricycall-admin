'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function FareSettingsPage() {
  const [fareId, setFareId] = useState(null)
  const [baseFare, setBaseFare] = useState('')
  const [perKmRate, setPerKmRate] = useState('')
  const [waitingFee, setWaitingFee] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadFares = async () => {
      const { data } = await supabase
        .from('fare_settings')
        .select('*')
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
  }, [])

  const saveFares = async () => {
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from('fare_settings')
      .update({
        base_fare: baseFare,
        per_km_rate: perKmRate,
        waiting_fee_per_min: waitingFee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fareId)

    if (!error) setSaved(true)
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