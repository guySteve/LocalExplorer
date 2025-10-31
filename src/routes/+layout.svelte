<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { currentPosition, currentAddress, latestLocationLabel } from '$lib/stores/appState';
	
	// Import CSS - Theme variables and app-wide styles
	import '/css/theme.css';
	import '../app.css';
	
	let { children } = $props();
	let mapsReady = false;
	let mapsInitialized = false;
	
	onMount(() => {
		if (!browser) return;
		
		// Initialize Google Maps API
		initGoogleMaps();
		
		// Register service worker for PWA/offline support
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker-v2.js')
				.then(registration => console.log('ServiceWorker registration successful:', registration.scope))
				.catch(err => console.warn('ServiceWorker registration failed:', err));
		}
		
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
	
	function initGoogleMaps() {
		// Check if script already exists
		if (document.querySelector('script[data-role="maps-api"]')) {
			console.log('Maps script already present.');
			if (typeof window.google !== 'undefined' && window.google.maps && !mapsInitialized) {
				console.log('Maps API already available, initializing services.');
				initMapServices();
			}
			return;
		}
		
		const mapsKey = window.MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY || '';
		
		if (!mapsKey || mapsKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
			console.warn('Maps API Key is missing or using placeholder!');
			showMapsConfigBanner();
			return;
		}
		
		console.log('Injecting Google Maps script...');
		const mapsScript = document.createElement('script');
		mapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places,geometry&callback=initMap&loading=async`;
		mapsScript.async = true;
		mapsScript.defer = true;
		mapsScript.dataset.role = 'maps-api';
		
		// Set up the callback
		window.initMap = initMapServices;
		
		mapsScript.addEventListener('load', () => {
			if (!mapsReady && typeof window.google !== 'undefined' && window.google.maps) {
				console.log('Maps script loaded, initializing services.');
				initMapServices();
			}
		});
		
		mapsScript.onerror = () => {
			console.error('Failed to load Google Maps script!');
			showMapsConfigBanner('error');
		};
		
		document.head.appendChild(mapsScript);
	}
	
	function initMapServices() {
		if (mapsInitialized) return;
		if (typeof window.google === 'undefined' || !window.google.maps) {
			console.warn('Google Maps API not available yet. Retrying...');
			setTimeout(initMapServices, 100);
			return;
		}
		
		try {
			// Create hidden map for Places service
			let hiddenMap = document.getElementById('hiddenMap');
			if (!hiddenMap) {
				hiddenMap = document.createElement('div');
				hiddenMap.id = 'hiddenMap';
				hiddenMap.style.display = 'none';
				document.body.appendChild(hiddenMap);
			}
			
			const map = new window.google.maps.Map(hiddenMap, { 
				center: { lat: 0, lng: 0 }, 
				zoom: 15 
			});
			
			window.placesService = new window.google.maps.places.PlacesService(map);
			window.geocoder = new window.google.maps.Geocoder();
			mapsReady = true;
			mapsInitialized = true;
			console.log('Maps services initialized.');
			
			// Request geolocation after maps are ready
			requestGeolocation();
		} catch (error) {
			console.error('Error during Maps service initialization:', error);
		}
	}
	
	function requestGeolocation() {
		if (!navigator.geolocation) {
			console.warn('Geolocation not supported.');
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
		
		// Reverse geocode to get address
		if (window.geocoder) {
			reverseGeocode(pos);
		} else {
			// Fallback to coordinates
			const coordsLabel = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
			latestLocationLabel.set(coordsLabel);
		}
	}
	
	function onLocationError(err) {
		console.warn('Geolocation failed:', err);
		latestLocationLabel.set('Location unavailable');
	}
	
	function reverseGeocode(pos) {
		if (!window.geocoder) return;
		
		window.geocoder.geocode({ location: pos }, (results, status) => {
			if (status === 'OK' && results[0]) {
				let city = '', state = '';
				
				results[0].address_components.forEach(comp => {
					if (comp.types.includes('locality')) city = comp.long_name;
					if (comp.types.includes('administrative_area_level_1')) {
						state = comp.short_name || comp.long_name;
					}
				});
				
				const locStr = city && state ? `${city}, ${state}` : city || state || results[0].formatted_address;
				latestLocationLabel.set(locStr);
				currentAddress.set(results[0].formatted_address);
			} else {
				console.warn('Reverse geocode failed:', status);
				const coordsLabel = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
				latestLocationLabel.set(coordsLabel);
			}
		});
	}
	
	function showMapsConfigBanner(type = 'warning') {
		const existingBanner = document.querySelector('.maps-config-banner');
		if (existingBanner) existingBanner.remove();
		
		const banner = document.createElement('div');
		banner.className = 'maps-config-banner';
		banner.style.cssText = `
			position: fixed;
			top: 60px;
			left: 0;
			right: 0;
			background: ${type === 'error' ? '#ff4444' : '#ff9800'};
			color: white;
			padding: 0.75rem 1rem;
			text-align: center;
			z-index: 9999;
			font-size: 0.9rem;
			box-shadow: 0 2px 8px rgba(0,0,0,0.2);
		`;
		banner.innerHTML = `
			<span style="margin-right: 0.5rem;">${type === 'error' ? '⚠️' : '🗺️'}</span>
			<span style="font-weight: 600;">
				${type === 'error' ? 'Maps API Error' : 'Maps API Not Configured'}
			</span>
			<span style="opacity: 0.9; margin-left: 0.5rem;">
				${type === 'error' ? 'Check API key and restrictions' : 'Setup required for full functionality'}
			</span>
			<button id="closeBanner" style="
				background: none;
				border: none;
				color: white;
				font-size: 1.2rem;
				cursor: pointer;
				margin-left: 1rem;
				padding: 0 0.5rem;
			">×</button>
		`;
		
		document.body.appendChild(banner);
		
		const closeBtn = document.getElementById('closeBanner');
		if (closeBtn) {
			closeBtn.onclick = () => banner.remove();
		}
		
		// Auto-dismiss after 10 seconds
		setTimeout(() => banner.remove(), 10000);
	}
</script>

<svelte:head>
	<title>Local Explorer - Discover Local Places & Events</title>
</svelte:head>

{@render children()}
