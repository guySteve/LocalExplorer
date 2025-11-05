<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { currentPosition, currentAddress, latestLocationLabel } from '$lib/stores/appState';
	
	// Import CSS - Theme variables and app-wide styles
	import '../app.css';
	// Import Leaflet CSS
	import 'leaflet/dist/leaflet.css';
	
	onMount(() => {
		if (!browser) return;
		
		// Register service worker for PWA (only in production)
		if (browser && 'serviceWorker' in navigator) {
			// Check if we're in production (service worker files exist)
			navigator.serviceWorker.register('/sw.js', { scope: '/' })
				.then(registration => {
					console.log('ServiceWorker registration successful:', registration.scope);
				})
				.catch(err => {
					// Don't log errors in development where SW files don't exist
					if (window.location.hostname !== 'localhost') {
						console.warn('ServiceWorker registration failed:', err);
					}
				});
		}
		
		// Request geolocation
		requestGeolocation();
		
		// Handle back button for modals
		window.addEventListener('popstate', handlePopstate);
		
		return () => {
			window.removeEventListener('popstate', handlePopstate);
		};
	});
	
	function handlePopstate() {
		// Close active modals
		document.querySelectorAll('.modal.active').forEach((modal) => {
			modal.classList.remove('active');
		});
		
		// Close details sheet if active
		const detailsSheet = document.getElementById('detailsSheet');
		if (detailsSheet?.classList.contains('active')) {
			detailsSheet.classList.remove('active');
		}
		
		// Ensure body class is removed
		if (!document.querySelector('.modal.active')) {
			document.body.classList.remove('modal-open');
		}
	}
	
	function requestGeolocation() {
		if (!navigator.geolocation) {
			console.warn('Geolocation not supported.');
			latestLocationLabel.set('Location unavailable');
			return;
		}
		
		console.log('Requesting geolocation...');
		navigator.geolocation.getCurrentPosition(
			onLocationSuccess,
			onLocationError,
			{
				enableHighAccuracy: false,
				timeout: 15000,
				maximumAge: 60000
			}
		);
	}
	
	function onLocationSuccess(position) {
		const pos = {
			lat: position.coords.latitude,
			lng: position.coords.longitude
		};
		
		console.log('Location obtained:', pos);
		currentPosition.set(pos);
		
		// Use reverse geocoding via Nominatim (OpenStreetMap)
		reverseGeocode(pos);
	}
	
	function onLocationError(err) {
		console.warn('Geolocation failed:', err);
		latestLocationLabel.set('Location unavailable');
	}
	
	async function reverseGeocode(pos) {
		try {
			// Use Nominatim for reverse geocoding (no API key required)
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&zoom=10&addressdetails=1`,
				{
					headers: {
						'User-Agent': 'LocalExplorer/1.0'
					}
				}
			);
			
			if (!response.ok) {
				throw new Error('Reverse geocoding failed');
			}
			
			const data = await response.json();
			
			if (data.address) {
				const city = data.address.city || data.address.town || data.address.village || '';
				const state = data.address.state || '';
				
				const locStr = city && state ? `${city}, ${state}` : city || state || data.display_name;
				latestLocationLabel.set(locStr);
				currentAddress.set(data.display_name || '');
			} else {
				const coordsLabel = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
				latestLocationLabel.set(coordsLabel);
			}
		} catch (error) {
			console.warn('Reverse geocode failed:', error);
			const coordsLabel = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
			latestLocationLabel.set(coordsLabel);
		}
	}
</script>

<svelte:head>
	<title>Local Explorer - Discover Local Places & Events</title>
</svelte:head>

<slot />
