<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	const dispatch = createEventDispatcher();
	
	// Props
	let { destination = null, destinationName = '', visible = false } = $props();
	
	// State
	let currentHeading = 0;
	let ringHeadingTarget = 0;
	let ringHeadingVisual = 0;
	let pitchTarget = 0;
	let pitchVisual = 0;
	let rollTarget = 0;
	let rollVisual = 0;
	
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
	
	// Constants
	const PITCH_LIMIT = 55;
	const ROLL_LIMIT = 45;
	const HEADING_SMOOTH = 0.12;
	const TILT_SMOOTH = 0.15;
	
	// Reactive: Start/stop services when visible changes
	$effect(() => {
		if (visible && browser) {
			init();
		} else if (!visible && browser) {
			cleanup();
		}
	});
	
	function init() {
		console.log('Compass: Initializing...');
		startOrientationListener();
		startMotionListener();
		startGeolocationWatch();
		startAnimation();
		
		// If we have a destination, fetch route
		if (destination) {
			fetchRoute();
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
	}
	
	function startOrientationListener() {
		if (orientationListener) return;
		
		const register = (eventName) => {
			console.log(`Compass: Registering orientation listener: ${eventName}`);
			orientationEventType = eventName;
			orientationListener = handleOrientation;
			window.addEventListener(eventName, orientationListener, true);
		};
		
		if (typeof DeviceOrientationEvent !== 'undefined' && 
		    typeof DeviceOrientationEvent.requestPermission === 'function') {
			// iOS 13+ requires permission
			DeviceOrientationEvent.requestPermission().then(permissionState => {
				if (permissionState === 'granted') {
					if ('ondeviceorientationabsolute' in window) {
						register('deviceorientationabsolute');
					} else {
						register('deviceorientation');
					}
				} else {
					console.warn('Compass: DeviceOrientation permission denied');
					alert('Compass permission was denied. Please grant it in your browser settings.');
				}
			}).catch(error => {
				console.error('Compass: Error requesting DeviceOrientation permission:', error);
				// Fallback
				if ('ondeviceorientationabsolute' in window) {
					register('deviceorientationabsolute');
				} else if ('ondeviceorientation' in window) {
					register('deviceorientation');
				}
			});
		} else {
			// Non-iOS or older browsers
			if ('ondeviceorientationabsolute' in window) {
				register('deviceorientationabsolute');
			} else if ('ondeviceorientation' in window) {
				register('deviceorientation');
			} else {
				console.warn('Compass: DeviceOrientation not supported');
				alert('Compass features are not supported on this device.');
			}
		}
	}
	
	function handleOrientation(event) {
		let heading = null;
		let beta = event.beta; // Pitch
		let gamma = event.gamma; // Roll
		
		if (typeof event.webkitCompassHeading === 'number') {
			heading = normalizeHeading(event.webkitCompassHeading);
		} else if (event.absolute === true && typeof event.alpha === 'number') {
			heading = normalizeHeading(event.alpha);
		} else if (typeof event.alpha === 'number') {
			heading = normalizeHeading(360 - event.alpha);
		}
		
		if (heading === null || Number.isNaN(heading)) return;
		
		currentHeading = heading;
		ringHeadingTarget = wrapAngle(360 - currentHeading);
		
		// Apply pitch and roll for 3D effect
		if (typeof beta === 'number' && !isNaN(beta)) {
			pitchTarget = clamp(beta * 0.5, -PITCH_LIMIT, PITCH_LIMIT);
		}
		
		if (typeof gamma === 'number' && !isNaN(gamma)) {
			rollTarget = clamp(gamma * 0.5, -ROLL_LIMIT, ROLL_LIMIT);
		}
		
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
			const headingStep = shortestAngle(ringHeadingVisual, ringHeadingTarget);
			ringHeadingVisual = wrapAngle(ringHeadingVisual + headingStep * HEADING_SMOOTH);
			
			pitchVisual += (pitchTarget - pitchVisual) * TILT_SMOOTH;
			rollVisual += (rollTarget - rollVisual) * TILT_SMOOTH;
			
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
		if (!routeSteps[index] || typeof speechSynthesis === 'undefined') return;
		
		const step = routeSteps[index];
		const instruction = stripHtml(step.instructions);
		
		speechSynthesis.cancel();
		
		const utterance = new SpeechSynthesisUtterance(instruction);
		utterance.rate = 1.1;
		utterance.pitch = 1;
		utterance.volume = 1;
		
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
	let statusText = $derived(
		orientationReady && geolocationReady ? 'Heading & GPS locked' :
		orientationReady ? 'Compass ready — waiting for GPS' :
		geolocationReady ? 'GPS ready — waiting for compass' :
		'Waiting for sensors…'
	);
	
	let statusClass = $derived(
		orientationReady && geolocationReady ? 'status-good' :
		orientationReady || geolocationReady ? 'status-warn' :
		'status-bad'
	);
	
	let headingDisplay = $derived(
		orientationReady ? `${String(Math.round(currentHeading)).padStart(3, '0')}°` : '---°'
	);
	
	let destinationDisplay = $derived(
		destination && destinationName ? 
			`${destinationName}${bearing !== '—' ? ` (${bearing}°)` : ''}` :
			destination ? 'Destination set' :
			'Pointing North'
	);
	
	let transform = $derived(
		`perspective(1000px) rotateX(${pitchVisual}deg) rotateY(${rollVisual}deg) rotateZ(${ringHeadingVisual}deg)`
	);
</script>

{#if visible}
<div class="compass-overlay" class:active={visible}>
	<div class="compass-container">
		<!-- Header -->
		<div class="compass-header">
			<div>
				<h2 class="compass-title">🧭 Compass</h2>
				<div class="destination-label">{destinationDisplay}</div>
			</div>
			<button class="close-btn" onclick={close} aria-label="Close compass">×</button>
		</div>
		
		<!-- Status -->
		<div class="compass-status">
			<span class="status-dot {statusClass}"></span>
			<span class="status-text">{statusText}</span>
		</div>
		
		<!-- Compass Dial -->
		<div class="compass-dial-container">
			<div class="compass-ring" style="transform: {transform}">
				<div class="compass-marker north">N</div>
				<div class="compass-marker east">E</div>
				<div class="compass-marker south">S</div>
				<div class="compass-marker west">W</div>
			</div>
			<div class="compass-needle">▲</div>
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
						<button class="nav-btn primary" onclick={startNavigation}>
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
		background: rgba(0, 0, 0, 0.85);
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
		border-radius: 20px;
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
		color: var(--card);
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
		color: var(--card);
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
		color: var(--card);
		font-weight: 600;
	}
	
	.compass-dial-container {
		position: relative;
		width: 250px;
		height: 250px;
		margin: 2rem auto;
	}
	
	.compass-ring {
		width: 100%;
		height: 100%;
		border: 4px solid var(--primary);
		border-radius: 50%;
		position: relative;
		background: radial-gradient(circle, rgba(var(--primary-rgb, 200, 121, 65), 0.1), transparent);
		transition: transform 0.1s ease-out;
	}
	
	.compass-marker {
		position: absolute;
		font-weight: 900;
		font-size: 1.5rem;
		color: var(--card);
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
	
	.compass-needle {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 3rem;
		color: var(--accent);
		filter: drop-shadow(0 0 10px var(--accent));
		pointer-events: none;
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
		color: var(--card);
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
		color: var(--card);
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
		border-radius: 8px;
		color: var(--card);
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
		color: var(--card);
		border-radius: var(--button-radius, 12px);
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
		font-family: var(--font-primary);
	}
	
	.nav-btn:hover:not(:disabled) {
		background: var(--card);
		color: var(--text-light);
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
			width: 200px;
			height: 200px;
		}
		
		.heading-value {
			font-size: 2.5rem;
		}
		
		.navigation-buttons {
			flex-direction: column;
		}
	}
</style>
