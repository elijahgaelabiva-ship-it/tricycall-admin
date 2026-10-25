import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TRICYCALL.SF Admin',
    short_name: 'Tricycall',
    start_url: '/dashboard',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    background_color: '#ffffff',
    theme_color: '#16a34a',
    icons: [
      { src: '/tricycle.png', sizes: '192x192', type: 'image/png' },
      { src: '/tricycle.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
