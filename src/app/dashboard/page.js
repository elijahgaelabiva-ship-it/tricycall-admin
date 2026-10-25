'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CardList from '@/components/CardList'
import DriverDetails from '@/components/DriverDetails'
import PassengerDetails from '@/components/PassengerDetails'
import TripDetails from '@/components/TripDetails'
import ReviewsPanel from '@/components/ReviewsPanel'
import ComplaintsPanel from '@/components/ComplaintsPanel'
import AdminPanel from '@/components/AdminPanel'

const CARD_LABELS = {
  totalDrivers: 'Total Drivers',
  activeDrivers: 'Active Drivers',
  totalPassengers: 'Passengers',
  activeTrips: 'Active Trips',
  completedTrips: 'Completed Trips',
  cancelledTrips: 'Cancelled Trips',
  reviews: 'Reviews',
  complaints: 'Complaints',
}

function viewTitle(view) {
  switch (view.type) {
    case 'list':
      return CARD_LABELS[view.key]
    case 'driver':
      return 'Driver details'
    case 'passenger':
      return 'Passenger profile'
    case 'trip':
      return 'Trip details'
    case 'driverReviews':
      return 'Driver reviews'
    default:
      return ''
  }
}

/* ---------- icons (inline SVG paths) ---------- */
const ICONS = {
  user: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  users:
    'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  check: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  x: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  bolt: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  star: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  warn: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  list: 'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75V12zm0 5.25h.007v.008H3.75v-.008z',
  card: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
  tag: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z',
  logout:
    'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
  chevron: 'M8.25 4.5l7.5 7.5-7.5 7.5',
  camera:
    'M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316zM16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z',
}

function Icon({ d, className = 'w-5 h-5' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d} />
    </svg>
  )
}

/* ---------- tricycle logo ----------
   Uses /public/tricycle.png if you upload it, otherwise draws a tricycle. */
function TricycleLogo({ className = 'w-8 h-8' }) {
  const [failed, setFailed] = useState(false)
  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/tricycle.png"
        alt="Tricycall"
        className={`${className} object-contain`}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* sidecar */}
      <path d="M5 30V19a4 4 0 014-4h14a6 6 0 016 6v9H5z" />
      <path d="M12 15v-3h10" />
      <path d="M28 30H36" />
      {/* motorcycle */}
      <path d="M34 30l6-11h8" />
      <path d="M48 19l5 11" />
      <path d="M44 15h8" />
      <path d="M38 19h-4" />
      {/* wheels */}
      <circle cx="13" cy="34" r="5" />
      <circle cx="35" cy="34" r="5" />
      <circle cx="53" cy="34" r="5" />
    </svg>
  )
}

/* ---------- avatar ---------- */
function Avatar({ url, initials, size = 'w-14 h-14', text = 'text-base' }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="Profile" className={`${size} rounded-full object-cover bg-gray-100`} />
    )
  }
  return (
    <div
      className={`${size} ${text} rounded-full bg-green-600 text-white font-bold flex items-center justify-center`}
    >
      {initials}
    </div>
  )
}

async function resizeImage(file, size = 320) {
  const bitmap = await createImageBitmap(file)
  const min = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    bitmap,
    (bitmap.width - min) / 2,
    (bitmap.height - min) / 2,
    min,
    min,
    0,
    0,
    size,
    size
  )
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85))
}

/* ---------- styling maps (full class names so Tailwind keeps them) ---------- */
const TONES = {
  green: 'bg-green-50 text-green-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  slate: 'bg-slate-100 text-slate-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
}

const ROLE_STYLES = {
  owner: 'bg-amber-100 text-amber-800 ring-amber-200',
  support: 'bg-blue-100 text-blue-800 ring-blue-200',
  viewer: 'bg-slate-100 text-slate-700 ring-slate-200',
  admin: 'bg-slate-100 text-slate-700 ring-slate-200',
}

const GROUPS = [
  {
    title: 'Drivers',
    cols: 'grid-cols-2',
    items: [
      { key: 'totalDrivers', label: 'Total drivers', icon: ICONS.user, tone: 'green' },
      { key: 'activeDrivers', label: 'Online now', icon: ICONS.check, tone: 'emerald' },
    ],
  },
  {
    title: 'Trips',
    cols: 'grid-cols-3',
    items: [
      { key: 'activeTrips', label: 'Active', icon: ICONS.bolt, tone: 'blue' },
      { key: 'completedTrips', label: 'Completed', icon: ICONS.check, tone: 'green' },
      { key: 'cancelledTrips', label: 'Cancelled', icon: ICONS.x, tone: 'slate' },
    ],
  },
  {
    title: 'Community',
    cols: 'grid-cols-3',
    items: [
      { key: 'totalPassengers', label: 'Passengers', icon: ICONS.users, tone: 'indigo' },
      { key: 'reviews', label: 'Reviews', icon: ICONS.star, tone: 'amber' },
      { key: 'complaints', label: 'Open complaints', icon: ICONS.warn, tone: 'red' },
    ],
  },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [perms, setPerms] = useState({})
  const [me, setMe] = useState({ email: '', role: '', avatar: '' })
  const [uploading, setUploading] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')
  // Navigation inside the details window: list -> driver / passenger / trip ...
  const [stack, setStack] = useState([])
  const cacheRef = useRef({})
  const fileRef = useRef(null)
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setPhotoMsg('')
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const blob = await resizeImage(file)
      const path = `${user.id}/avatar.jpg`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${pub.publicUrl}?v=${Date.now()}`
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sess.session?.access_token}`,
        },
        body: JSON.stringify({ avatar_url: url }),
      })
      if (!res.ok) throw new Error('Could not save photo')
      setMe((prev) => ({ ...prev, avatar: url }))
    } catch (err) {
      setPhotoMsg(err.message || 'Upload failed')
    }
    setUploading(false)
  }

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

      // Read role/permissions through the server (reliable)
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${sess.session?.access_token}` },
      })
      const meData = res.ok ? await res.json() : {}
      setMe({
        email: user.email || '',
        role: meData.role || 'admin',
        avatar: meData.avatar_url || '',
      })
      if (meData.role === 'owner') {
        setPerms({ complaints: true, drivers: true, trips_edit: true, subscriptions: true, fares: true })
      } else {
        setPerms(meData.permissions || {})
      }

      const [
        { count: totalDrivers },
        { count: activeDrivers },
        { count: totalPassengers },
        { count: activeTrips },
        { count: completedTrips },
        { count: cancelledTrips },
        { count: reviews },
        { count: complaints },
      ] = await Promise.all([
        supabase.from('drivers').select('*', { count: 'exact', head: true }),
        supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'passenger'),
        supabase.from('trips').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'arrived', 'ongoing']),
        supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('ratings').select('*', { count: 'exact', head: true }),
        // Open (unresolved) complaints
        supabase.from('trip_reports').select('*', { count: 'exact', head: true }).eq('resolved', false),
      ])

      setStats({
        totalDrivers,
        activeDrivers,
        totalPassengers,
        activeTrips,
        completedTrips,
        cancelledTrips,
        reviews,
        complaints,
      })
      setLoading(false)
    }

    loadStats()
  }, [router])

  const refreshComplaintCount = async () => {
    const { count } = await supabase
      .from('trip_reports')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false)
    setStats((prev) => (prev ? { ...prev, complaints: count } : prev))
  }

  const openCard = (key) => {
    cacheRef.current = {}
    setStack([{ type: 'list', key }])
  }
  const open = (view) => setStack((prev) => [...prev, view])
  const back = () => setStack((prev) => prev.slice(0, -1))
  const close = () => {
    setStack([])
    cacheRef.current = {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <div className="w-9 h-9 rounded-full border-4 border-green-200 border-t-green-600 animate-spin" />
        <p className="text-sm text-gray-500">Loading dashboard...</p>
      </div>
    )
  }

  const view = stack[stack.length - 1]
  const initials = (me.email || '?').slice(0, 2).toUpperCase()
  const roleStyle = ROLE_STYLES[me.role] || ROLE_STYLES.admin

  const actions = [
    perms.drivers && {
      label: 'Manage Drivers',
      sub: 'Approve, edit and suspend drivers',
      icon: ICONS.user,
      tone: 'green',
      href: '/drivers',
    },
    {
      label: 'View All Trips',
      sub: 'Browse every trip and its status',
      icon: ICONS.list,
      tone: 'blue',
      href: '/trips',
    },
    perms.subscriptions && {
      label: 'Subscriptions',
      sub: 'Driver plans and payments',
      icon: ICONS.card,
      tone: 'indigo',
      href: '/subscriptions',
    },
    perms.fares && {
      label: 'Fare Settings',
      sub: 'Rates and pricing rules',
      icon: ICONS.tag,
      tone: 'amber',
      href: '/fares',
    },
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center overflow-hidden">
              <TricycleLogo className="w-9 h-9" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900">TRICYCALL.SF</p>
              <p className="text-[11px] text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition"
          >
            <Icon d={ICONS.logout} className="w-4 h-4" />
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
        {/* Profile card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative shrink-0"
              aria-label="Change profile photo"
            >
              <Avatar url={me.avatar} initials={initials} size="w-16 h-16" text="text-lg" />
              <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white border border-gray-300 text-gray-600 flex items-center justify-center shadow">
                <Icon d={ICONS.camera} className="w-3.5 h-3.5" />
              </span>
              {uploading && (
                <span className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                  <span className="w-5 h-5 rounded-full border-2 border-green-200 border-t-green-600 animate-spin" />
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">Signed in as</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{me.email}</p>
              <span
                className={`inline-block mt-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ring-1 ring-inset ${roleStyle}`}
              >
                {me.role}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            {photoMsg ? <span className="text-red-600">{photoMsg}</span> : 'Tap your photo to change it.'}
          </p>
        </div>

        {/* Stat groups */}
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
              {group.title}
            </h2>
            <div className={`grid ${group.cols} gap-3`}>
              {group.items.map((item) => {
                const value = stats[item.key]
                const alert = item.key === 'complaints' && value > 0
                return (
                  <button
                    key={item.key}
                    onClick={() => openCard(item.key)}
                    className={`text-left bg-white border rounded-2xl p-3.5 shadow-sm hover:shadow-md active:scale-[0.98] transition ${
                      alert ? 'border-red-300' : 'border-gray-200'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${TONES[item.tone]}`}
                    >
                      <Icon d={item.icon} className="w-5 h-5" />
                    </div>
                    <p className={`text-2xl font-bold leading-none ${alert ? 'text-red-600' : 'text-gray-900'}`}>
                      {value ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5">{item.label}</p>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        {/* Quick actions */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
            Manage
          </h2>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
            {actions.map((a) => (
              <button
                key={a.href}
                onClick={() => router.push(a.href)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <div
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${TONES[a.tone]}`}
                >
                  <Icon d={a.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{a.label}</p>
                  <p className="text-xs text-gray-500 truncate">{a.sub}</p>
                </div>
                <Icon d={ICONS.chevron} className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </section>

        {/* Owner only: renders nothing for everyone else */}
        <AdminPanel />
      </main>

      {/* Details window: full screen */}
      {view && (
        <div className="fixed inset-0 bg-white flex flex-col" style={{ zIndex: 9999 }}>
          <div className="flex items-center gap-2 px-4 h-14 shrink-0 border-b border-gray-200 bg-white">
            {stack.length > 1 ? (
              <button
                onClick={back}
                className="text-green-700 font-semibold text-sm px-2.5 py-1.5 rounded-lg hover:bg-green-50"
                aria-label="Back"
              >
                &larr; Back
              </button>
            ) : null}
            <h2 className="font-bold text-gray-900 flex-1 truncate">{viewTitle(view)}</h2>
            <button
              onClick={close}
              className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 text-2xl leading-none flex items-center justify-center hover:bg-gray-200"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className="overflow-y-auto p-4 flex-1 bg-gray-50">
            <div className="max-w-2xl mx-auto">
              {view.type === 'list' && view.key === 'reviews' && (
                <ReviewsPanel key="reviews" onOpen={open} />
              )}
              {view.type === 'list' && view.key === 'complaints' && (
                <ComplaintsPanel key="complaints" onOpen={open} onChanged={refreshComplaintCount} />
              )}
              {view.type === 'list' && view.key !== 'reviews' && view.key !== 'complaints' && (
                <CardList key={view.key} cardKey={view.key} onOpen={open} cache={cacheRef} />
              )}
              {view.type === 'driver' && <DriverDetails key={view.id} id={view.id} onOpen={open} />}
              {view.type === 'passenger' && (
                <PassengerDetails key={view.id} id={view.id} onOpen={open} />
              )}
              {view.type === 'trip' && <TripDetails key={view.id} id={view.id} onOpen={open} />}
              {view.type === 'driverReviews' && (
                <ReviewsPanel key={`dr-${view.id}`} driverId={view.id} onOpen={open} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
