'use client'

import dynamic from 'next/dynamic'

// Leaflet needs the browser, so the map is only loaded on the client.
const LazyTripMap = dynamic(() => import('@/components/TripMap'), {
  ssr: false,
  loading: () => <div className="h-56 rounded-xl bg-gray-100 animate-pulse" />,
})

export default LazyTripMap
