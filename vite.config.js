import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['icon-192.png', 'icon-512.png'],
			manifest: {
				name: 'Local Explorer',
				short_name: 'LocalExplorer',
				description: 'Discover and explore local places, events, attractions, and activities near you',
				theme_color: '#f8f7f2',
				background_color: '#f8f7f2',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: 'icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			workbox: {
				// SvelteKit-specific configuration
				globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2}'],
				// Don't try to precache index.html since SvelteKit handles routing differently
				navigateFallback: null,
				navigateFallbackDenylist: [/^\/api/, /^\/_app/, /^\/\.netlify/],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'gstatic-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'google-maps-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
							}
						}
					},
					{
						// Cache page routes for offline access
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'NetworkFirst',
						options: {
							cacheName: 'pages-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 // 1 day
							}
						}
					}
				]
			},
			devOptions: {
				enabled: true
			}
		})
	]
});
