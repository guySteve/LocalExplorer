<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { selectedVoiceUri, voiceNavigationEnabled } from '$lib/stores/appState';
	import { Navigation } from 'lucide-svelte';
	import compassArrow from '$lib/assets/compass-arrow.svg';

	const dispatch = createEventDispatcher();
	
	// Props
	export let destination = null;
	export let destinationName = '';
	export let visible = false;
	
	// Multi-stop trip support
	$: isMultiStop = Array.isArray(destination) && destination.length > 0;
	$: currentStops = isMultiStop ? destination : (destination ? [destination] : []);
	let currentStopIndex = 0;
	$: currentDestination = currentStops.length > 0 ? currentStops[currentStopIndex] : null;
	$: currentDestinationName = isMultiStop 
		? `Stop ${currentStopIndex + 1} of ${currentStops.length}${currentStops[currentStopIndex]?.name ? ': ' + currentStops[currentStopIndex].name : ''}`
		: destinationName;
	
	// State
	let currentHeading = 0;
	let ringHeadingTarget = 0;
	let ringHeadingVisual = 0;
	let personHeadingTarget = 0;
	let personHeadingVisual = 0;
	
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
	let isMapCentered = true; // Track if map is auto-centering
	let currentZoom = DEFAULT_ZOOM; // Track current zoom level
	
	// Constants
	const HEADING_SMOOTH = 0.2; // Increased for smoother rotation
	const MAP_INIT_DELAY_MS = 100; // Delay to ensure DOM is ready
	const MAP_INIT_RETRY_DELAY_MS = 500; // Delay between retry attempts
	const MAX_MAP_INIT_RETRIES = 10; // Maximum number of retry attempts
	const DEFAULT_ZOOM = 18; // Default map zoom level
	const MIN_INDICATOR_SCALE = 0.5; // Minimum scale for indicators when zoomed out
	const MAX_INDICATOR_SCALE = 2; // Maximum scale for indicators when zoomed in
	const ZOOM_SCALE_BASE = 18; // Base zoom level for 1:1 scale
	
	// Cardinal direction names for display
	// Note: Boundaries are non-overlapping. Each range uses >= for min and < for max,
	// so exact boundary values (22.5, 67.5, etc.) belong to the next direction.
	const CARDINAL_DIRECTIONS = [
		{ name: 'North', min: 337.5, max: 360 },
		{ name: 'North', min: 0, max: 22.5 },
		{ name: 'Northeast', min: 22.5, max: 67.5 },
		{ name: 'East', min: 67.5, max: 112.5 },
		{ name: 'Southeast', min: 112.5, max: 157.5 },
		{ name: 'South', min: 157.5, max: 202.5 },
		{ name: 'Southwest', min: 202.5, max: 247.5 },
		{ name: 'West', min: 247.5, max: 292.5 },
		{ name: 'Northwest', min: 292.5, max: 337.5 }
	];
	
	// Map type cycling order
	const MAP_TYPE_ORDER = { 'terrain': 'satellite', 'satellite': 'roadmap', 'roadmap': 'terrain' };
	
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
		currentStopIndex = 0; // Reset to first stop
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
		if (currentDestination) {
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
				zoom: DEFAULT_ZOOM,
				mapTypeId: 'terrain', // Terrain style map
				disableDefaultUI: true, // Disable all default UI - we'll add controls outside
				gestureHandling: 'greedy', // Allow map interaction
				keyboardShortcuts: true,
				heading: 0, // Will be updated based on device orientation
				tilt: 0 // Flat view for terrain style
			});
			
			// Listen for user-initiated drag events
			map.addListener('dragstart', () => {
				isMapCentered = false;
			});
			
			// Listen for zoom changes
			map.addListener('zoom_changed', () => {
				if (map) {
					currentZoom = map.getZoom();
				}
			});
			
			mapInitialized = true;
			console.log('Compass: Map initialized with terrain style');
		} catch (error) {
			console.error('Compass: Error initializing map:', error);
			mapInitialized = false;
		}
	}
	
	// Update map heading based on device orientation
	$: if (map && orientationReady) {
		map.setHeading(currentHeading);
	}
	
	// Update map center when position changes, but only if auto-centering is enabled
	$: if (map && currentPosition && isMapCentered) {
		map.setCenter({ lat: currentPosition.lat, lng: currentPosition.lng });
	}
	
	// Map control functions
	function zoomIn() {
		if (map) {
			try {
				const currentZoom = map.getZoom();
				const maxZoom = map.mapTypes.get(map.getMapTypeId())?.maxZoom || 21;
				if (currentZoom < maxZoom) {
					map.setZoom(currentZoom + 1);
				}
			} catch (error) {
				console.warn('Compass: Error zooming in:', error);
			}
		}
	}
	
	function zoomOut() {
		if (map) {
			try {
				const currentZoom = map.getZoom();
				const minZoom = map.mapTypes.get(map.getMapTypeId())?.minZoom || 0;
				if (currentZoom > minZoom) {
					map.setZoom(currentZoom - 1);
				}
			} catch (error) {
				console.warn('Compass: Error zooming out:', error);
			}
		}
	}
	
	function toggleMapType() {
		if (map) {
			try {
				const currentType = map.getMapTypeId();
				const newType = MAP_TYPE_ORDER[currentType] || 'terrain';
				map.setMapTypeId(newType);
			} catch (error) {
				console.warn('Compass: Error changing map type:', error);
			}
		}
	}
	
	function recenterMap() {
		isMapCentered = true;
		if (map && currentPosition) {
			map.setCenter({ lat: currentPosition.lat, lng: currentPosition.lng });
		}
	}
	
	// Calculate indicator scale based on zoom level
	function getIndicatorScale(zoom) {
		return Math.max(MIN_INDICATOR_SCALE, Math.min(MAX_INDICATOR_SCALE, zoom / ZOOM_SCALE_BASE));
	}
	
	// Get the next map type label for display
	function getNextMapTypeLabel(mapInstance) {
		if (!mapInstance) return 'Terrain';
		try {
			const currentType = mapInstance.getMapTypeId();
			const nextType = MAP_TYPE_ORDER[currentType] || 'terrain';
			return nextType.charAt(0).toUpperCase() + nextType.slice(1);
		} catch (error) {
			return 'Terrain';
		}
	}
	
	// Reactive statement for next map type label
	$: nextMapTypeLabel = getNextMapTypeLabel(map);
	
	// Reactive statement for indicator scale
	$: indicatorScale = getIndicatorScale(currentZoom);
	
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
		// Wrap personHeadingTarget to 0-360 range to prevent wobble at 0/360 crossing
		personHeadingTarget = wrapAngle(-currentHeading);
		
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
				
				// Calculate bearing to current destination
				if (currentDestination) {
					const destLat = typeof currentDestination.lat === 'function' ? currentDestination.lat() : (currentDestination.location?.lat || currentDestination.lat);
					const destLng = typeof currentDestination.lng === 'function' ? currentDestination.lng() : (currentDestination.location?.lng || currentDestination.lng);
					
					if (window.google && window.google.maps && destLat && destLng) {
						const curLatLng = new window.google.maps.LatLng(currentPosition.lat, currentPosition.lng);
						const destLatLng = new window.google.maps.LatLng(destLat, destLng);
						bearing = Math.round(window.google.maps.geometry.spherical.computeHeading(curLatLng, destLatLng)).toString();
						
						// Check if close to destination (within 50 meters) for multi-stop
						if (isMultiStop && currentStopIndex < currentStops.length - 1) {
							const distance = window.google.maps.geometry.spherical.computeDistanceBetween(curLatLng, destLatLng);
							if (distance < 50) { // Within 50 meters
								console.log('Compass: Close to destination, ready for next stop');
							}
						}
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
			// Smoothly interpolate visual values towards targets using shortest angle
			const headingStep = shortestAngle(ringHeadingVisual, ringHeadingTarget);
			ringHeadingVisual = wrapAngle(ringHeadingVisual + headingStep * HEADING_SMOOTH);
			
			// Smooth person icon rotation using shortest angle to prevent wobble
			const personStep = shortestAngle(personHeadingVisual, personHeadingTarget);
			personHeadingVisual = wrapAngle(personHeadingVisual + personStep * HEADING_SMOOTH);
			
			animationFrameId = requestAnimationFrame(animate);
		};
		
		animationFrameId = requestAnimationFrame(animate);
	}
	
	async function fetchRoute() {
		if (!currentPosition || !currentDestination || !window.google || !window.google.maps) {
			console.warn('Compass: Cannot fetch route - missing requirements');
			return;
		}
		
		const directionsService = new window.google.maps.DirectionsService();
		
		const destLat = typeof currentDestination.lat === 'function' ? currentDestination.lat() : (currentDestination.location?.lat || currentDestination.lat);
		const destLng = typeof currentDestination.lng === 'function' ? currentDestination.lng() : (currentDestination.location?.lng || currentDestination.lng);
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
	
	function nextStop() {
		if (!isMultiStop || currentStopIndex >= currentStops.length - 1) {
			return;
		}
		
		currentStopIndex++;
		stopNavigation();
		
		// Fetch route to new destination
		if (currentDestination) {
			fetchRoute();
		}
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
		let wrapped = angle % 360;
		if (wrapped < 0) wrapped += 360;
		return wrapped;
	}
	
	function shortestAngle(from, to) {
		// Ensure both angles are normalized to 0-360
		from = wrapAngle(from);
		to = wrapAngle(to);
		
		let delta = to - from;
		
		// Find the shortest rotation direction
		if (delta > 180) {
			delta -= 360;
		} else if (delta < -180) {
			delta += 360;
		}
		
		return delta;
	}
	
	function getCardinalDirection(heading) {
		const normalized = wrapAngle(heading);
		for (const dir of CARDINAL_DIRECTIONS) {
			if (normalized >= dir.min && normalized < dir.max) {
				return dir.name;
			}
		}
		return 'North'; // Fallback
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
		currentDestination && currentDestinationName ? 
			`${currentDestinationName}${bearing !== '—' ? ` (${bearing}°)` : ''}` :
			currentDestination ? 'Destination set' :
			orientationReady ? `Pointing ${getCardinalDirection(currentHeading)}` : 'Pointing North';
	
	$: ringTransform = `rotateZ(${ringHeadingVisual}deg)`;
	$: personTransform = `rotateZ(${personHeadingVisual}deg)`; // Person icon rotates with smoothing
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
					<Navigation size={24} color="currentColor" />
					<span>Compass</span>
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
				
				<!-- Fixed center dot showing user's location -->
				<div class="location-center-dot" style="transform: scale({indicatorScale})">
					<svg viewBox="0 0 100 100" class="center-dot-svg" role="img" aria-label="Your location">
						<defs>
							<filter id="centerDotGlow" x="-50%" y="-50%" width="200%" height="200%">
								<feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
								<feOffset dx="0" dy="0" result="offsetblur"/>
								<feComponentTransfer>
									<feFuncA type="linear" slope="0.8"/>
								</feComponentTransfer>
								<feMerge>
									<feMergeNode/>
									<feMergeNode in="SourceGraphic"/>
								</feMerge>
							</filter>
						</defs>
						
						<!-- Center position dot -->
						<circle cx="50" cy="50" r="8" fill="var(--primary, #c87941)" stroke="white" stroke-width="3" filter="url(#centerDotGlow)" />
					</svg>
				</div>
				
				<!-- Rotating arc indicator showing device heading -->
				<div class="heading-arc-indicator" style="transform: {personTransform} scale({indicatorScale})">
					<img src={compassArrow} alt="Direction indicator" class="compass-arrow-svg" />
				</div>
			</div>
		</div>
		
		<!-- Map Controls (below compass) -->
		{#if mapInitialized}
			<div class="map-controls">
				<button class="map-control-btn" on:click={zoomIn} aria-label="Zoom in" title="Zoom in">
					<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
						<line x1="12" y1="5" x2="12" y2="19" stroke-width="2"/>
						<line x1="5" y1="12" x2="19" y2="12" stroke-width="2"/>
					</svg>
				</button>
				<button class="map-control-btn" on:click={zoomOut} aria-label="Zoom out" title="Zoom out">
					<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
						<line x1="5" y1="12" x2="19" y2="12" stroke-width="2"/>
					</svg>
				</button>
				<button class="map-control-btn map-type-btn" on:click={toggleMapType} aria-label="Change to {nextMapTypeLabel}" title="Switch to {nextMapTypeLabel}">
					<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
						<rect x="3" y="3" width="7" height="7" stroke-width="2"/>
						<rect x="14" y="3" width="7" height="7" stroke-width="2"/>
						<rect x="3" y="14" width="7" height="7" stroke-width="2"/>
						<rect x="14" y="14" width="7" height="7" stroke-width="2"/>
					</svg>
					<span class="map-type-label">{nextMapTypeLabel}</span>
				</button>
				{#if !isMapCentered}
					<button class="map-control-btn recenter-btn" on:click={recenterMap} aria-label="Re-center map" title="Re-center on your location">
						<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
							<circle cx="12" cy="12" r="3" stroke-width="2"/>
							<line x1="12" y1="2" x2="12" y2="6" stroke-width="2"/>
							<line x1="12" y1="18" x2="12" y2="22" stroke-width="2"/>
							<line x1="2" y1="12" x2="6" y2="12" stroke-width="2"/>
							<line x1="18" y1="12" x2="22" y2="12" stroke-width="2"/>
						</svg>
					</button>
				{/if}
			</div>
		{/if}
		
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
		
		<!-- Multi-stop Progress (if applicable) -->
		{#if isMultiStop}
			<div class="multi-stop-progress">
				<div class="progress-text">
					Stop {currentStopIndex + 1} of {currentStops.length}
				</div>
				<div class="progress-bar">
					<div class="progress-fill" style="width: {((currentStopIndex + 1) / currentStops.length) * 100}%"></div>
				</div>
				{#if currentStopIndex < currentStops.length - 1}
					<button class="nav-btn next-stop-btn" onclick={nextStop}>
						⏭️ Next Stop
					</button>
				{/if}
			</div>
		{/if}
		
		<!-- Navigation Controls (if destination is set) -->
		{#if currentDestination && routeSteps.length > 0}
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
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
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
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
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
	
	/* Fixed center dot showing user location */
	.location-center-dot {
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: 4;
		pointer-events: none;
		width: 24px;
		height: 24px;
		margin-left: -12px;
		margin-top: -12px;
		transform-origin: center center;
		transition: transform 0.3s ease-out;
	}
	
	.center-dot-svg {
		width: 100%;
		height: 100%;
	}
	
	/* Rotating arc indicator showing heading */
	.heading-arc-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform-origin: center center;
		z-index: 3;
		pointer-events: none;
		width: 64px;
		height: 64px;
		margin-left: -32px;
		margin-top: -32px;
		transition: transform 0.1s ease-out;
		opacity: 0.95;
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
	
	.compass-arrow-svg {
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
		color: var(--primary, #c87941);
	}
	
	.arc-svg {
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
	}
	
	/* Map Controls below compass */
	.map-controls {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
	
	.map-control-btn {
		background: var(--card);
		border: 2px solid rgba(var(--card-rgb, 26, 43, 68), 0.2);
		border-radius: 8px;
		min-width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
		color: var(--text-light);
		padding: 0 0.5rem;
	}
	
	.map-type-btn {
		width: auto;
		padding: 0 0.75rem;
	}
	
	.map-type-label {
		font-size: 0.85rem;
		font-weight: 600;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
		white-space: nowrap;
	}
	
	.recenter-btn {
		background: var(--primary);
		border-color: var(--primary);
		animation: pulse 2s ease-in-out infinite;
	}
	
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}
	
	.map-control-btn:hover {
		background: var(--primary);
		border-color: var(--primary);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}
	
	.map-control-btn:active {
		transform: translateY(0);
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
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	}
	
	.heading-label {
		font-size: 0.9rem;
		color: var(--text-light);
		opacity: 0.8;
		margin-top: 0.25rem;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
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
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	}
	
	.multi-stop-progress {
		margin: 1.5rem 0;
		padding: 1rem;
		background: rgba(var(--primary-rgb, 200, 121, 65), 0.1);
		border-radius: 8px;
		border: 2px solid var(--primary);
	}
	
	.progress-text {
		text-align: center;
		font-weight: 700;
		font-size: 1rem;
		color: var(--text-light);
		margin-bottom: 0.75rem;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	}
	
	.progress-bar {
		height: 8px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 1rem;
	}
	
	.progress-fill {
		height: 100%;
		background: var(--primary);
		transition: width 0.3s ease;
		box-shadow: 0 0 10px var(--primary);
	}
	
	.next-stop-btn {
		width: 100%;
		background: var(--primary);
		border-color: var(--primary);
		color: var(--text-light);
	}
	
	.next-stop-btn:hover {
		background: var(--secondary);
		border-color: var(--secondary);
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
		
		.location-center-dot {
			width: 20px;
			height: 20px;
			margin-left: -10px;
			margin-top: -10px;
		}
		
		.heading-arc-indicator {
			width: 56px;
			height: 56px;
			margin-left: -28px;
			margin-top: -28px;
		}
		
		.map-control-btn {
			min-width: 40px;
			height: 40px;
		}
		
		.map-type-label {
			font-size: 0.75rem;
		}
	}
</style>
