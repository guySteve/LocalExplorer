<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { selectedVoiceUri, voiceNavigationEnabled } from '$lib/stores/appState';
	import { GOOGLE_COMPASS_MAP_ID } from '$lib/utils/uiConstants';

	const dispatch = createEventDispatcher();
	
	// Props
	export let destination = null;
	export let destinationName = '';
	export let visible = false;
	
	// State
	let currentHeading = 0;
	let ringHeadingTarget = 0;
	let ringHeadingVisual = 0;
	
	let orientationReady = false;
	let geolocationReady = false;
	let currentPosition = null;
	let currentSpeed = 0;
	let accuracy = '—';
	let bearing = '—';
	
	let watchId = null;
	let orientationListener = null;
	let orientationEventType = null;
	let motionListener = null;
	let animationFrameId = null;
	
	let routeSteps = [];
	let currentStepIndex = 0;
	let navigationActive = false;
	let permissionState = 'prompt'; // 'prompt', 'granted', or 'denied'
	
	// Google Map state
	let mapContainer = null;
	let map = null;
	let mapInitialized = false;
	
	// Constants
	const HEADING_SMOOTH = 0.12;
	const MAP_INIT_DELAY_MS = 100; // Delay to ensure DOM is ready
	const MAP_INIT_RETRY_DELAY_MS = 500; // Delay between retry attempts
	const MAX_MAP_INIT_RETRIES = 10; // Maximum number of retry attempts
	
	// Retry counter for map initialization
	let mapInitRetryCount = 0;
	
	// Reactive: Start/stop services when visible changes
	$: if (visible && browser) {
		init();
	} else if (!visible && browser) {
		cleanup();
	}
	
	// Reactive: Try to initialize map when mapContainer becomes available
	$: if (visible && browser && mapContainer && !mapInitialized && currentPosition) {
		initializeMap();
	}
	
	function init() {
		console.log('Compass: Initializing...');
		mapInitRetryCount = 0; // Reset retry counter
		requestSensorPermissions(); // Automatically request permissions on open
		startGeolocationWatch();
		startAnimation();
		
		// Initialize Google Map after a short delay to ensure DOM is ready
		setTimeout(() => {
			if (mapContainer && !mapInitialized) {
				initializeMap();
			}
		}, MAP_INIT_DELAY_MS);
		
		// If we have a destination, fetch route
		if (destination) {
			fetchRoute();
		}
	}

	async function requestSensorPermissions() {
		if (typeof DeviceOrientationEvent !== 'undefined' &&
			typeof DeviceOrientationEvent.requestPermission === 'function') {
			try {
				const state = await DeviceOrientationEvent.requestPermission();
				if (state === 'granted') {
					startOrientationListener();
					startMotionListener();
					permissionState = 'granted';
				} else {
					console.warn('Compass: DeviceOrientation permission denied');
					permissionState = 'denied';
				}
			} catch (err) {
				console.error('Compass: Error requesting DeviceOrientation permission:', err);
				permissionState = 'denied';
			}
		} else {
			console.log('Compass: No permission required, starting sensors.');
			startOrientationListener();
			startMotionListener();
			permissionState = 'granted';
		}
	}
	
	function cleanup() {
		console.log('Compass: Cleaning up...');
		
		if (watchId) {
			navigator.geolocation.clearWatch(watchId);
			watchId = null;
		}
		
		if (orientationListener && orientationEventType) {
			window.removeEventListener(orientationEventType, orientationListener, true);
			orientationListener = null;
			orientationEventType = null;
		}
		
		if (motionListener) {
			window.removeEventListener('devicemotion', motionListener, true);
			motionListener = null;
		}
		
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		
		// Stop speech
		if (typeof speechSynthesis !== 'undefined') {
			speechSynthesis.cancel();
		}
		
		// Reset state
		orientationReady = false;
		geolocationReady = false;
		navigationActive = false;
		routeSteps = [];
		currentStepIndex = 0;
		mapInitialized = false; // Reset map initialization flag for next open
		map = null;
		mapInitRetryCount = 0; // Reset retry counter
	}
	
	function initializeMap() {
		if (!window.google || !window.google.maps || !currentPosition || !mapContainer) {
			console.log('Compass: Waiting for Google Maps, position, or container...');
			// Retry after a short delay if we're still visible and haven't exceeded max retries
			if (visible && !mapInitialized && mapInitRetryCount < MAX_MAP_INIT_RETRIES) {
				mapInitRetryCount++;
				setTimeout(() => {
					if (visible && !mapInitialized) {
						initializeMap();
					}
				}, MAP_INIT_RETRY_DELAY_MS);
			} else if (mapInitRetryCount >= MAX_MAP_INIT_RETRIES) {
				console.warn('Compass: Max map initialization retries reached. Map will not be displayed.');
			}
			return;
		}
		
		// Avoid double initialization
		if (mapInitialized) {
			return;
		}
		
		try {
			map = new window.google.maps.Map(mapContainer, {
				center: { lat: currentPosition.lat, lng: currentPosition.lng },
				zoom: 18,
				mapId: GOOGLE_COMPASS_MAP_ID,
				disableDefaultUI: true,
				gestureHandling: 'none',
				keyboardShortcuts: false,
				heading: 0, // Will be updated based on device orientation
				tilt: 45 // 3D view
			});
			
			mapInitialized = true;
			console.log('Compass: Map initialized with ID:', GOOGLE_COMPASS_MAP_ID);
		} catch (error) {
			console.error('Compass: Error initializing map:', error);
			mapInitialized = false;
		}
	}
	
	// Update map heading based on device orientation
	$: if (map && orientationReady) {
		map.setHeading(currentHeading);
	}
	
	// Update map center when position changes
	$: if (map && currentPosition) {
		map.setCenter({ lat: currentPosition.lat, lng: currentPosition.lng });
	}
	
	function startOrientationListener() {
		if (orientationListener) return;
		
		const register = (eventName) => {
			console.log(`Compass: Registering orientation listener: ${eventName}`);
			orientationEventType = eventName;
			orientationListener = handleOrientation;
			window.addEventListener(eventName, orientationListener, true);
		};
		
		if ('ondeviceorientationabsolute' in window) {
			register('deviceorientationabsolute');
		} else if ('ondeviceorientation' in window) {
			register('deviceorientation');
		} else {
			console.warn('Compass: DeviceOrientation not supported');
			alert('Compass features are not supported on this device.');
		}
	}
	
	function handleOrientation(event) {
		let heading = null;
		
		if (typeof event.webkitCompassHeading === 'number') {
			heading = normalizeHeading(event.webkitCompassHeading);
		} else if (event.absolute === true && typeof event.alpha === 'number') {
			heading = normalizeHeading(event.alpha);
		} else if (typeof event.alpha === 'number') {
			// Fallback for non-absolute orientation
			heading = normalizeHeading(360 - event.alpha);
		}
		
		if (heading === null || Number.isNaN(heading)) return;
		
		currentHeading = heading;
		ringHeadingTarget = wrapAngle(360 - currentHeading);
		
		orientationReady = true;
	}
	
	function startMotionListener() {
		if (motionListener) return;
		
		if (typeof DeviceMotionEvent !== 'undefined') {
			if (typeof DeviceMotionEvent.requestPermission === 'function') {
				DeviceMotionEvent.requestPermission().then(permissionState => {
					if (permissionState === 'granted') {
						motionListener = () => {}; // Placeholder
						window.addEventListener('devicemotion', motionListener, true);
						console.log('Compass: Gyroscope listener registered');
					}
				}).catch(error => {
					console.error('Compass: Error requesting DeviceMotion permission:', error);
				});
			} else {
				motionListener = () => {};
				window.addEventListener('devicemotion', motionListener, true);
				console.log('Compass: Gyroscope listener registered');
			}
		}
	}
	
	function startGeolocationWatch() {
		if (!navigator.geolocation) {
			console.warn('Compass: Geolocation not supported');
			return;
		}
		
		watchId = navigator.geolocation.watchPosition(
			(position) => {
				geolocationReady = true;
				currentPosition = {
					lat: position.coords.latitude,
					lng: position.coords.longitude
				};
				
				const speed = (typeof position.coords.speed === 'number' && !Number.isNaN(position.coords.speed)) 
					? position.coords.speed : 0;
				currentSpeed = speed.toFixed(1);
				
				accuracy = (typeof position.coords.accuracy === 'number' && !Number.isNaN(position.coords.accuracy))
					? Math.round(position.coords.accuracy).toString()
					: '—';
				
				// Calculate bearing to destination
				if (destination) {
					const destLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat;
					const destLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng;
					
					if (window.google && window.google.maps) {
						const curLatLng = new window.google.maps.LatLng(currentPosition.lat, currentPosition.lng);
						const destLatLng = new window.google.maps.LatLng(destLat, destLng);
						bearing = Math.round(window.google.maps.geometry.spherical.computeHeading(curLatLng, destLatLng)).toString();
					}
				}
			},
			(error) => {
				console.error('Compass: Geolocation watch error:', error);
				geolocationReady = false;
			},
			{ enableHighAccuracy: true }
		);
	}
	
	function startAnimation() {
		if (animationFrameId) return;
		
		const animate = () => {
			// Smoothly interpolate visual values towards targets
			const headingStep = shortestAngle(ringHeadingVisual, ringHeadingTarget);
			ringHeadingVisual = wrapAngle(ringHeadingVisual + headingStep * HEADING_SMOOTH);
			
			animationFrameId = requestAnimationFrame(animate);
		};
		
		animationFrameId = requestAnimationFrame(animate);
	}
	
	async function fetchRoute() {
		if (!currentPosition || !destination || !window.google || !window.google.maps) {
			console.warn('Compass: Cannot fetch route - missing requirements');
			return;
		}
		
		const directionsService = new window.google.maps.DirectionsService();
		
		const destLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat;
		const destLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng;
		const destLatLng = new window.google.maps.LatLng(destLat, destLng);
		
		directionsService.route(
			{
				origin: currentPosition,
				destination: destLatLng,
				travelMode: window.google.maps.TravelMode.DRIVING
			},
			(result, status) => {
				if (status === window.google.maps.DirectionsStatus.OK && result?.routes?.length) {
					routeSteps = result.routes[0].legs[0].steps;
					console.log(`Compass: Route fetched with ${routeSteps.length} steps`);
				} else {
					console.error('Compass: Route fetch failed:', status);
					routeSteps = [];
				}
			}
		);
	}
	
	function startNavigation() {
		if (!$voiceNavigationEnabled) {
			alert('Enable voice navigation in Settings to use turn-by-turn guidance.');
			return;
		}
		if (!routeSteps || routeSteps.length === 0) {
			alert('No route available. Please wait for route to load.');
			return;
		}
		
		navigationActive = true;
		currentStepIndex = 0;
		speakStep(currentStepIndex);
	}
	
	function stopNavigation() {
		navigationActive = false;
		if (typeof speechSynthesis !== 'undefined') {
			speechSynthesis.cancel();
		}
	}
	
	function nextStep() {
		if (currentStepIndex < routeSteps.length - 1) {
			currentStepIndex++;
			speakStep(currentStepIndex);
		}
	}
	
	function speakStep(index) {
		if (!$voiceNavigationEnabled) return;
		// Check if voice is enabled
		if (browser) {
			const voiceEnabled = localStorage.getItem('voiceEnabled');
			if (voiceEnabled === 'false') return;
		}
		
		if (!routeSteps[index] || typeof speechSynthesis === 'undefined') return;
		
		const step = routeSteps[index];
		const instruction = stripHtml(step.instructions);
		
		speechSynthesis.cancel();
		
		const utterance = new SpeechSynthesisUtterance(instruction);
		utterance.rate = 1.1;
		utterance.pitch = 1;
		utterance.volume = 1;
		
		// Use selected voice if available
		const voiceUri = $selectedVoiceUri;
		if (voiceUri) {
			const voices = speechSynthesis.getVoices();
			const selectedVoice = voices.find(v => v.voiceURI === voiceUri);
			if (selectedVoice) {
				utterance.voice = selectedVoice;
			}
		}
		
		utterance.onend = () => {
			if (navigationActive && currentStepIndex < routeSteps.length - 1) {
				setTimeout(() => {
					currentStepIndex++;
					speakStep(currentStepIndex);
				}, 1000);
			}
		};
		
		speechSynthesis.speak(utterance);
	}
	
	function close() {
		dispatch('close');
	}
	
	// Utility functions
	function normalizeHeading(heading) {
		if (heading === null || typeof heading === 'undefined') return null;
		let h = heading % 360;
		return h < 0 ? h + 360 : h;
	}
	
	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}
	
	function wrapAngle(angle) {
		return (angle % 360 + 360) % 360;
	}
	
	function shortestAngle(from, to) {
		return ((to - from + 540) % 360) - 180;
	}
	
	function stripHtml(html) {
		const tmp = document.createElement('div');
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || '';
	}
	
	// Computed values
	$: statusText = 
		orientationReady && geolocationReady ? 'Heading & GPS locked' :
		orientationReady ? 'Compass ready — waiting for GPS' :
		geolocationReady ? 'GPS ready — waiting for compass' :
		'Waiting for sensors…';
	
	$: statusClass = 
		orientationReady && geolocationReady ? 'status-good' :
		orientationReady || geolocationReady ? 'status-warn' :
		'status-bad';
	
	$: headingDisplay = 
		orientationReady ? `${String(Math.round(currentHeading)).padStart(3, '0')}°` : '---°';
	
	$: destinationDisplay = 
		destination && destinationName ? 
			`${destinationName}${bearing !== '—' ? ` (${bearing}°)` : ''}` :
			destination ? 'Destination set' :
			'Pointing North';
	
	$: ringTransform = `rotateZ(${ringHeadingVisual}deg)`;
	$: personTransform = `rotateZ(${-currentHeading}deg)`; // Person icon rotates opposite to stay pointing in device direction
</script>

{#if visible}
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="compass-overlay" class:active={visible} on:click={close} on:keydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }} role="dialog" aria-modal="true" tabindex="0">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="compass-container" on:click={(e) => e.stopPropagation()} on:keydown={(e) => e.stopPropagation()} role="document" tabindex="-1">
		<!-- Header -->
		<div class="compass-header">
			<div>
				<h2 class="compass-title">
					<span class="compass-icon" aria-hidden="true"></span> Compass
				</h2>
				<div class="destination-label">{destinationDisplay}</div>
			</div>
			<button class="close-btn" on:click={close} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }} aria-label="Close compass" type="button">×</button>
		</div>
		
		<!-- Status -->
		<div class="compass-status">
			<span class="status-dot {statusClass}"></span>
			<span class="status-text">{statusText}</span>
		</div>
		
		<!-- Compass Dial -->
		<div class="compass-dial-container">
			{#if permissionState !== 'granted'}
				<div class="permission-overlay">
					{#if permissionState === 'prompt'}
						<p>Compass requires sensor access to function.</p>
						<button class="nav-btn primary" on:click={requestSensorPermissions}>
							🛰️ Activate Sensors
						</button>
					{:else}
						<p>Sensor access was denied. You must grant permission in your browser's site settings to use the compass.</p>
					{/if}
				</div>
			{/if}
			
			<!-- Outer rotating ring with cardinal directions -->
			<div class="compass-ring" style="transform: {ringTransform}">
				<div class="compass-marker north">N</div>
				<div class="compass-marker east">E</div>
				<div class="compass-marker south">S</div>
				<div class="compass-marker west">W</div>
			</div>
			
			<!-- Inner map container -->
			<div class="compass-map-container">
				<div class="compass-map" bind:this={mapContainer}></div>
				
				<!-- CompassMan icon on top of map, rotating with device -->
				<div class="person-icon" style="transform: {personTransform}">
					<img src="/compassman" alt="Compass indicator" class="compassman-image" />
				</div>
			</div>
		</div>
		
		<!-- Heading Display -->
		<div class="heading-display">
			<div class="heading-value">{headingDisplay}</div>
			<div class="heading-label">Current Heading</div>
		</div>
		
		<!-- Stats -->
		<div class="compass-stats">
			<div class="stat">
				<div class="stat-label">Speed</div>
				<div class="stat-value">{currentSpeed} m/s</div>
			</div>
			<div class="stat">
				<div class="stat-label">Accuracy</div>
				<div class="stat-value">{accuracy}m</div>
			</div>
		</div>
		
		<!-- Navigation Controls (if destination is set) -->
		{#if destination && routeSteps.length > 0}
			<div class="navigation-controls">
				<div class="route-info">
					<strong>Route:</strong> {routeSteps.length} steps
					{#if currentStepIndex < routeSteps.length}
						<br />
						<small>Step {currentStepIndex + 1}: {stripHtml(routeSteps[currentStepIndex].instructions).substring(0, 60)}...</small>
					{/if}
				</div>
				
				<div class="navigation-buttons">
					{#if !navigationActive}
						<button class="nav-btn primary" onclick={startNavigation} disabled={!$voiceNavigationEnabled} title={$voiceNavigationEnabled ? 'Start guided navigation' : 'Enable voice navigation in Settings'}>
							🎙️ Start Voice Navigation
						</button>
					{:else}
						<button class="nav-btn" onclick={stopNavigation}>
							🔇 Stop Navigation
						</button>
						<button class="nav-btn" onclick={nextStep} disabled={currentStepIndex >= routeSteps.length - 1}>
							⏭️ Next Step
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
{/if}

<style>
	.compass-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--background-overlay, rgba(0, 0, 0, 0.85));
		display: none;
		z-index: 2000;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	
	.compass-overlay.active {
		display: flex;
	}
	
	.compass-container {
		background: var(--background);
		max-width: 500px;
		width: 100%;
		border-radius: var(--radius);
		padding: 1.5rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
		animation: fadeIn 0.3s ease-out;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	
	.compass-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}
	
	.compass-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-light);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.compass-icon {
		display: inline-block;
		width: 0;
		height: 0;
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-bottom: 14px solid currentColor;
		position: relative;
		flex-shrink: 0;
	}
	
	.compass-icon::after {
		content: '';
		position: absolute;
		width: 0;
		height: 0;
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-top: 14px solid currentColor;
		left: -8px;
		top: 4px;
		opacity: 0.5;
	}
	
	.destination-label {
		margin-top: 0.25rem;
		font-size: 0.9rem;
		color: var(--primary);
		font-weight: 600;
	}
	
	.close-btn {
		background: none;
		border: none;
		font-size: 2rem;
		color: var(--text-light);
		cursor: pointer;
		padding: 0;
		line-height: 1;
		opacity: 0.7;
		transition: opacity 0.2s;
	}
	
	.close-btn:hover {
		opacity: 1;
	}
	
	.compass-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(var(--card-rgb, 26, 43, 68), 0.1);
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}
	
	.status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}
	
	.status-dot.status-good {
		background: #4caf50;
		box-shadow: 0 0 10px #4caf50;
	}
	
	.status-dot.status-warn {
		background: #ff9800;
		box-shadow: 0 0 10px #ff9800;
	}
	
	.status-dot.status-bad {
		background: #f44336;
		box-shadow: 0 0 10px #f44336;
	}
	
	.status-text {
		font-size: 0.9rem;
		color: var(--text-light);
		font-weight: 600;
	}
	
	.compass-dial-container {
		position: relative;
		width: 300px;
		height: 300px;
		margin: 2rem auto;
	}

	/* Permission overlay prompts user before starting sensors */
	.permission-overlay {
		position: absolute;
		inset: 0;
		background: var(--background);
		z-index: 10;
		border-radius: 50%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 2rem;
		color: var(--text-light);
	}

	.permission-overlay p {
		font-weight: 600;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}
	
	/* Outer rotating ring - always points North */
	.compass-ring {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 4px solid var(--primary);
		border-radius: 50%;
		background: transparent;
		transition: transform 0.1s ease-out;
		pointer-events: none;
		z-index: 2;
	}
	
	/* Cardinal direction markers on the ring */
	.compass-marker {
		position: absolute;
		font-weight: 900;
		font-size: 1.5rem;
		color: var(--text-light);
		pointer-events: none;
	}
	
	.compass-marker.north {
		top: -40px;
		left: 50%;
		transform: translateX(-50%);
		color: var(--accent);
		font-size: 2rem;
	}
	
	.compass-marker.east {
		right: -40px;
		top: 50%;
		transform: translateY(-50%);
	}
	
	.compass-marker.south {
		bottom: -40px;
		left: 50%;
		transform: translateX(-50%);
	}
	
	.compass-marker.west {
		left: -40px;
		top: 50%;
		transform: translateY(-50%);
	}
	
	/* Map container inside the compass */
	.compass-map-container {
		position: absolute;
		inset: 10px;
		border-radius: 50%;
		overflow: hidden;
		z-index: 1;
		box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
	}
	
	.compass-map {
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}
	
	/* CompassMan icon on top of map */
	.person-icon {
		position: absolute;
		top: 50%;
		left: 50%;
		transform-origin: center center;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		width: 120px;
		height: 120px;
		margin-left: -60px;
		margin-top: -60px;
		transition: transform 0.1s ease-out;
		filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
	}
	
	.compassman-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	
	.heading-display {
		text-align: center;
		margin: 1.5rem 0;
	}
	
	.heading-value {
		font-size: 3rem;
		font-weight: 900;
		color: var(--primary);
		font-family: var(--font-primary);
	}
	
	.heading-label {
		font-size: 0.9rem;
		color: var(--text-light);
		opacity: 0.8;
		margin-top: 0.25rem;
	}
	
	.compass-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin: 1.5rem 0;
	}
	
	.stat {
		text-align: center;
		padding: 1rem;
		background: rgba(var(--card-rgb, 26, 43, 68), 0.05);
		border-radius: 8px;
	}
	
	.stat-label {
		font-size: 0.85rem;
		color: var(--text-light);
		opacity: 0.7;
		margin-bottom: 0.25rem;
	}
	
	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--primary);
	}
	
	.navigation-controls {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(var(--card-rgb, 26, 43, 68), 0.1);
	}
	
	.route-info {
		margin-bottom: 1rem;
		padding: 1rem;
		background: rgba(var(--primary-rgb, 200, 121, 65), 0.1);
		border-radius: var(--radius);
		color: var(--text-light);
		line-height: 1.6;
	}
	
	.navigation-buttons {
		display: flex;
		gap: 0.75rem;
	}
	
	.nav-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 2px solid var(--card);
		background: transparent;
		color: var(--text-light);
		border-radius: var(--radius);
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
		font-family: var(--font-primary);
	}
	
	.nav-btn:hover:not(:disabled) {
		background: var(--card);
		color: var(--text-light);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
	
	.nav-btn.primary {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--text-light);
	}
	
	.nav-btn.primary:hover {
		background: var(--secondary);
		border-color: var(--secondary);
	}
	
	.nav-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	@media (max-width: 768px) {
		.compass-dial-container {
			width: 240px;
			height: 240px;
		}
		
		.heading-value {
			font-size: 2.5rem;
		}
		
		.navigation-buttons {
			flex-direction: column;
		}
		
		.person-icon {
			width: 80px;
			height: 80px;
			margin-left: -40px;
			margin-top: -40px;
		}
	}
</style>
