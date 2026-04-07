import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'vibemeet',
    short_name: 'vibemeet',
    description: 'Scopri eventi e venue intorno a te',
    start_url: '/it/map',
    display: 'standalone',
    background_color: '#0A0A0F',
    theme_color: '#7C3AED',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png'
      }
    ],
    categories: ['social', 'entertainment', 'lifestyle'],
    lang: 'it',
    screenshots: [
      {
        src: '/screenshot-map.png',
        sizes: '390x844',
        type: 'image/png',
        label: 'vibemeet Map View'
      }
    ]
  };
}
