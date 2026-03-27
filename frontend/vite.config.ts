import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Use 'prompt' so the app asks users to update, rather than auto-reloading mid-session
      registerType: 'prompt',

      // Exclude the firebase-messaging-sw.js from the Vite PWA precache —
      // it self-registers at the root and is managed independently by FCM.
      strategies: 'generateSW',
      injectRegister: 'auto',

      workbox: {
        // Lightweight workbox config — cache app shell only
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Avoid caching the FCM service worker itself
        globIgnores: ['firebase-messaging-sw.js'],
        // NavigateFallback lets the SPA handle all client-side routes
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Keep runtimeCaching minimal to preserve battery
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },

      manifest: {
        name: 'HostelFlow',
        short_name: 'HostelFlow',
        description: 'Smart hostel management — complaints, meals, leaves & attendance.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
          { src: '/favicon.ico', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/favicon.ico', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
