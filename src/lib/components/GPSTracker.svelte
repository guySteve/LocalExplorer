<script>
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import L from 'leaflet';
	import { Play, Pause, Save, X } from 'lucide-svelte';
	import { gpsTracks } from '$lib/stores/storage';
	import { exportTrackToGPX } from '$lib/utils/exportImport';
	import { currentPosition as liveLocation } from '$lib/stores/appState';
	import { createMap } from '$lib/utils/leafletMap';
	import { attachTileToggle } from '$lib/utils/tileLayerToggle';
	
	const dispatch = createEventDispatcher();
	
	export let visible = false;
	
	// Phases: 'idle' | 'recording' | 'finished'
	let phase = 'idle';
	let isPaused = false;
	let autoPaused = false;
	
	let activityType = 'hike'; // 'hike' | 'bike' | 'run' | 'walk'
	const ACTIVITIES = [
		{ value: 'hike', label: '🥾 Hike' },
		{ value: 'bike', label: '🚴 Bike' },
		{ value: 'run', label: '🏃 Run' },
		{ value: 'walk', label: '🚶 Walk' }
	];
	
	let trackPoints = [];
	let startTime = null;
	let elapsedTime = 0;       // total wall clock
	let movingTime = 0;        // excludes paused/auto-paused time
	let lastTickTime = null;
	let totalDistance = 0;     // meters
	let currentSpeed = 0;      // m/s (from GPS)
	let maxSpeed = 0;          // m/s
	let elevationGain = 0;     // meters
	let elevationLoss = 0;     // meters
	let currentElevation = null;
	let gpsAccuracy = null;
	let trackName = '';
	let trackNotes = '';
	let watchId = null;
	let intervalId = null;
	let lastPosition = null;
	let lastMovementTime = null;
	let autoPauseEnabled = true;
	
	// GPS quality thresholds
	const MIN_MOVE_METERS = 5;          // ignore jitter under this
	const MAX_ACCURACY_METERS = 35;     // discard low-quality fixes
	const ELEVATION_THRESHOLD = 2;      // smooth elevation noise
	const AUTO_PAUSE_AFTER_MS = 20000;  // auto-pause after 20s stationary
	
	const DEFAULT_CENTER = [37.7749, -122.4194];
	let map;
	let mapContainer;
	let tileToggleControl = null;
	let trackPolyline = null;
	let positionMarker = null;
	let followPosition = true;
	
	// Use mph/min-per-mile style imperial display with metric fallback handled in format fns
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}
	
	function handleClose() {
		if (phase === 'recording' && !confirm('Stop recording and discard this track?')) {
			return;
		}
		stopWatchers();
		phase = 'idle';
		resetTrack();
		dispatch('close');
	}
	
	function startRecording() {
		if (!navigator.geolocation) {
			alert('Geolocation is not supported by your browser');
			return;
		}
		
		phase = 'recording';
		isPaused = false;
		autoPaused = false;
		startTime = Date.now();
		lastTickTime = startTime;
		lastMovementTime = startTime;
		trackPoints = [];
		totalDistance = 0;
		movingTime = 0;
		elapsedTime = 0;
		currentSpeed = 0;
		maxSpeed = 0;
		elevationGain = 0;
		elevationLoss = 0;
		currentElevation = null;
		lastPosition = null;
		
		watchId = navigator.geolocation.watchPosition(
			handlePositionUpdate,
			handlePositionError,
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
		);
		
		intervalId = setInterval(tick, 1000);
	}
	
	function tick() {
		const now = Date.now();
		elapsedTime = now - startTime;
		const delta = now - lastTickTime;
		lastTickTime = now;
		
		const effectivelyPaused = isPaused || autoPaused;
		if (!effectivelyPaused) {
			movingTime += delta;
		}
		
		// Auto-pause: no meaningful movement for a while
		if (autoPauseEnabled && !isPaused && phase === 'recording') {
			if (!autoPaused && now - lastMovementTime > AUTO_PAUSE_AFTER_MS) {
				autoPaused = true;
				currentSpeed = 0;
			}
		}
	}
	
	function pauseRecording() {
		isPaused = !isPaused;
		if (isPaused) {
			autoPaused = false;
			currentSpeed = 0;
		} else {
			lastMovementTime = Date.now();
		}
	}
	
	function finishRecording() {
		stopWatchers();
		phase = trackPoints.length > 0 ? 'finished' : 'idle';
		isPaused = false;
		autoPaused = false;
	}
	
	function stopWatchers() {
		if (watchId !== null) {
			navigator.geolocation.clearWatch(watchId);
			watchId = null;
		}
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}
	
	function handlePositionUpdate(position) {
		if (isPaused || phase !== 'recording') return;
		
		gpsAccuracy = position.coords.accuracy;
		// Discard low-quality fixes (prevents wild distance spikes under tree cover)
		if (position.coords.accuracy != null && position.coords.accuracy > MAX_ACCURACY_METERS) {
			return;
		}
		
		const point = {
			lat: position.coords.latitude,
			lng: position.coords.longitude,
			timestamp: position.timestamp,
			accuracy: position.coords.accuracy,
			elevation: position.coords.altitude ?? null,
			speed: position.coords.speed ?? null
		};
		
		// Device-reported speed (m/s) when available
		if (point.speed != null && point.speed >= 0) {
			currentSpeed = point.speed;
			if (point.speed > maxSpeed) maxSpeed = point.speed;
		}
		
		if (lastPosition) {
			const distance = calculateDistance(lastPosition.lat, lastPosition.lng, point.lat, point.lng);
			
			if (distance > MIN_MOVE_METERS) {
				totalDistance += distance;
				
				// Derive speed from positions if device didn't report it
				if (point.speed == null && point.timestamp > lastPosition.timestamp) {
					const dt = (point.timestamp - lastPosition.timestamp) / 1000;
					if (dt > 0) {
						const derived = distance / dt;
						currentSpeed = derived;
						if (derived > maxSpeed && derived < 30) maxSpeed = derived; // sanity cap 30 m/s
					}
				}
				
				// Elevation gain/loss with noise threshold
				if (point.elevation != null && currentElevation != null) {
					const dElev = point.elevation - currentElevation;
					if (Math.abs(dElev) >= ELEVATION_THRESHOLD) {
						if (dElev > 0) elevationGain += dElev;
						else elevationLoss += Math.abs(dElev);
						currentElevation = point.elevation;
					}
				} else if (point.elevation != null) {
					currentElevation = point.elevation;
				}
				
				trackPoints = [...trackPoints, point];
				lastPosition = point;
				lastMovementTime = Date.now();
				
				// Resume from auto-pause on movement
				if (autoPaused) {
					autoPaused = false;
				}
			}
		} else {
			trackPoints = [...trackPoints, point];
			lastPosition = point;
			if (point.elevation != null) currentElevation = point.elevation;
		}
		
		updatePositionMarker(point);
	}
	
	function handlePositionError(error) {
		console.error('GPS error:', error);
		
		let message = 'Unable to get GPS position. ';
		switch (error.code) {
			case error.PERMISSION_DENIED:
				message += 'Please enable location permissions.';
				break;
			case error.POSITION_UNAVAILABLE:
				message += 'GPS position unavailable.';
				break;
			case error.TIMEOUT:
				message += 'GPS request timed out.';
				break;
			default:
				message += 'An unknown error occurred.';
		}
		alert(message);
	}
	
	function calculateDistance(lat1, lng1, lat2, lng2) {
		const R = 6371000;
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLng = (lng2 - lng1) * Math.PI / 180;
		const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		          Math.sin(dLng/2) * Math.sin(dLng/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		return R * c;
	}
	
	// ── Derived stats ────────────────────────────────────────────────────
	$: avgSpeed = movingTime > 0 ? totalDistance / (movingTime / 1000) : 0; // m/s
	$: currentPaceText = formatPace(currentSpeed);
	$: avgPaceText = formatPace(avgSpeed);
	
	function metersToMiles(m) { return m / 1609.344; }
	function msToMph(ms) { return ms * 2.236936; }
	
	function formatPace(speedMs) {
		// min per mile
		if (!speedMs || speedMs < 0.2) return '--:--';
		const minPerMile = 26.8224 / speedMs;
		if (minPerMile > 99) return '--:--';
		const mins = Math.floor(minPerMile);
		const secs = Math.round((minPerMile - mins) * 60);
		return `${mins}:${String(secs).padStart(2, '0')}`;
	}
	
	function formatSpeed(speedMs) {
		return `${msToMph(speedMs).toFixed(1)} mph`;
	}
	
	function formatElevation(meters) {
		return `${Math.round(meters * 3.28084)} ft`;
	}
	
	// ── Map ──────────────────────────────────────────────────────────────
	function getInitialCenter() {
		const latestPoint = trackPoints[trackPoints.length - 1] || lastPosition || $liveLocation;
		if (latestPoint?.lat && latestPoint?.lng) {
			return [latestPoint.lat, latestPoint.lng];
		}
		return DEFAULT_CENTER;
	}
	
	function initMap() {
		if (!browser || map || !mapContainer) return;
		const [lat, lng] = getInitialCenter();
		map = createMap(mapContainer, { center: [lat, lng], zoom: 15, zoomControl: false });
		tileToggleControl = attachTileToggle(map);
		map.on('dragstart', () => { followPosition = false; });
		setTimeout(() => map?.invalidateSize(), 100);
		if (trackPoints.length > 0) {
			updateMapTrack();
		}
	}
	
	function destroyMap() {
		clearMapTrack();
		if (positionMarker && map) {
			map.removeLayer(positionMarker);
		}
		positionMarker = null;
		if (tileToggleControl) {
			tileToggleControl.remove();
			tileToggleControl = null;
		}
		if (map) {
			map.remove();
			map = null;
		}
	}
	
	function updateMapTrack() {
		if (!map || trackPoints.length === 0) return;
		const latLngs = trackPoints.map(point => [point.lat, point.lng]);
		if (!trackPolyline) {
			trackPolyline = L.polyline(latLngs, {
				color: 'var(--primary, #c95f33)'.startsWith('var') ? '#c95f33' : '#c95f33',
				weight: 4,
				opacity: 0.9
			}).addTo(map);
		} else {
			trackPolyline.setLatLngs(latLngs);
		}
		
		if (phase === 'finished') {
			const bounds = trackPolyline.getBounds();
			if (bounds.isValid()) {
				map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
			}
		}
	}
	
	function updatePositionMarker(point) {
		if (!map) return;
		const latLng = [point.lat, point.lng];
		if (!positionMarker) {
			positionMarker = L.circleMarker(latLng, {
				radius: 8,
				color: '#ffffff',
				weight: 2,
				fillColor: '#2f80ed',
				fillOpacity: 1
			}).addTo(map);
		} else {
			positionMarker.setLatLng(latLng);
		}
		if (followPosition) {
			map.panTo(latLng, { animate: true });
		}
	}
	
	function recenter() {
		followPosition = true;
		if (lastPosition && map) {
			map.panTo([lastPosition.lat, lastPosition.lng]);
		}
	}
	
	function clearMapTrack() {
		if (trackPolyline && map) {
			map.removeLayer(trackPolyline);
		}
		trackPolyline = null;
	}
	
	// ── Save / export ────────────────────────────────────────────────────
	function saveTrack() {
		if (trackPoints.length === 0) {
			alert('No track data to save');
			return;
		}
		if (!trackName.trim()) {
			alert('Please enter a name for this track');
			return;
		}
		
		gpsTracks.add({
			name: trackName.trim(),
			activity: activityType,
			points: trackPoints,
			distance: totalDistance,
			duration: elapsedTime,
			movingTime,
			avgSpeed,
			maxSpeed,
			elevationGain,
			elevationLoss,
			notes: trackNotes.trim()
		});
		
		alert(`Track "${trackName}" saved to Field Journal!`);
		resetTrack();
		phase = 'idle';
		dispatch('close');
	}
	
	function exportTrack() {
		if (trackPoints.length === 0) {
			alert('No track data to export');
			return;
		}
		
		const trackData = {
			name: trackName.trim() || 'GPS Track',
			points: trackPoints,
			distance: totalDistance,
			duration: elapsedTime,
			notes: trackNotes.trim(),
			created: Date.now()
		};
		
		try {
			exportTrackToGPX(trackData, `${trackData.name.replace(/\s+/g, '-')}.gpx`);
		} catch (error) {
			alert(`Export failed: ${error.message}`);
		}
	}
	
	function discardTrack() {
		if (!confirm('Discard this track? This cannot be undone.')) return;
		resetTrack();
		phase = 'idle';
	}
	
	function resetTrack() {
		trackPoints = [];
		totalDistance = 0;
		elapsedTime = 0;
		movingTime = 0;
		currentSpeed = 0;
		maxSpeed = 0;
		elevationGain = 0;
		elevationLoss = 0;
		currentElevation = null;
		trackName = '';
		trackNotes = '';
		startTime = null;
		lastPosition = null;
		gpsAccuracy = null;
		followPosition = true;
		clearMapTrack();
	}
	
	function formatTime(ms) {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const s = seconds % 60;
		const m = minutes % 60;
		if (hours > 0) return `${hours}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
		return `${m}:${String(s).padStart(2,'0')}`;
	}
	
	function formatDistance(meters) {
		const miles = metersToMiles(meters);
		if (miles >= 0.1) {
			return `${miles.toFixed(2)} mi`;
		}
		return `${(meters * 3.28084).toFixed(0)} ft`;
	}
	
	$: showMap = visible && (phase === 'recording' || phase === 'finished');
	
	$: if (showMap && mapContainer) {
		initMap();
	} else if (!showMap && map) {
		destroyMap();
	}
	
	$: if (map && trackPoints.length > 0) {
		updateMapTrack();
	}
	
onDestroy(() => {
	stopWatchers();
	destroyMap();
});
</script>

<svelte:window on:keydown={(e) => visible && e.key === 'Escape' && handleClose()} />

{#if visible}
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal active" on:click={handleBackdropClick} role="dialog" aria-modal="true" tabindex="-1">
	<div class="modal-content" role="document">
		<div class="modal-header">
			<h3>🗺️ Route Tracker</h3>
			<button class="close-btn" on:click={handleClose} type="button">×</button>
		</div>
		
		<div class="tracker-content">
			{#if phase === 'idle'}
				<div class="start-screen">
					<p class="info-text">Record your ride or hike with live speed, pace, and elevation stats. Tracks save to your Field Journal and export as GPX.</p>
					
					<div class="form-group">
						<span class="group-label">Activity</span>
						<div class="activity-picker">
							{#each ACTIVITIES as a}
								<button
									type="button"
									class="activity-btn {activityType === a.value ? 'selected' : ''}"
									on:click={() => activityType = a.value}
								>{a.label}</button>
							{/each}
						</div>
					</div>
					
					<div class="form-group">
						<label for="trackName">Track Name</label>
						<input 
							id="trackName"
							type="text" 
							placeholder="e.g., Morning Hike" 
							bind:value={trackName}
							class="form-input"
						/>
					</div>
					
					<div class="form-group">
						<label for="trackNotes">Notes (optional)</label>
						<textarea 
							id="trackNotes"
							placeholder="Add any notes about this track..." 
							bind:value={trackNotes}
							class="form-textarea"
							rows="2"
						></textarea>
					</div>
					
					<label class="autopause-row">
						<input type="checkbox" bind:checked={autoPauseEnabled} />
						<span>Auto-pause when stopped</span>
					</label>
					
					<button class="start-btn" on:click={startRecording}>
						<Play size={20} />
						<span>Start Recording</span>
					</button>
				</div>
			{:else if phase === 'recording'}
				<div class="recording-screen">
					<div class="status-indicator {isPaused || autoPaused ? 'paused' : 'recording'}">
						{#if isPaused}⏸️ Paused
						{:else if autoPaused}🅿️ Auto-paused — move to resume
						{:else}🔴 Recording {activityType}{/if}
						{#if gpsAccuracy != null}
							<span class="gps-badge" title="GPS accuracy">±{Math.round(gpsAccuracy)}m</span>
						{/if}
					</div>
					
					<div class="hero-stats">
						<div class="hero-stat">
							<div class="hero-value">{formatDistance(totalDistance)}</div>
							<div class="hero-label">Distance</div>
						</div>
						<div class="hero-stat">
							<div class="hero-value">{formatTime(movingTime)}</div>
							<div class="hero-label">Moving Time</div>
						</div>
					</div>
					
					<div class="stats-grid">
						<div class="stat-card">
							<div class="stat-label">{activityType === 'bike' ? 'Speed' : 'Pace'}</div>
							<div class="stat-value">{activityType === 'bike' ? formatSpeed(currentSpeed) : `${currentPaceText} /mi`}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">{activityType === 'bike' ? 'Avg Speed' : 'Avg Pace'}</div>
							<div class="stat-value">{activityType === 'bike' ? formatSpeed(avgSpeed) : `${avgPaceText} /mi`}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Elev Gain</div>
							<div class="stat-value">↗ {formatElevation(elevationGain)}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Elapsed</div>
							<div class="stat-value">{formatTime(elapsedTime)}</div>
						</div>
					</div>
					
					<div class="tracker-map" bind:this={mapContainer}>
						{#if !map}
							<div class="map-placeholder">Map warming up…</div>
						{/if}
						{#if map && !followPosition}
							<button class="recenter-btn" on:click={recenter} type="button">⌖ Re-center</button>
						{/if}
					</div>
					
					<div class="recording-controls">
						<button class="control-btn pause-btn" on:click={pauseRecording}>
							{#if isPaused}
								<Play size={24} />
								<span>Resume</span>
							{:else}
								<Pause size={24} />
								<span>Pause</span>
							{/if}
						</button>
						
						<button class="control-btn stop-btn" on:click={finishRecording}>
							<span>■</span>
							<span>Finish</span>
						</button>
					</div>
				</div>
			{:else if phase === 'finished'}
				<div class="summary-screen">
					<h4 class="summary-title">Activity Summary</h4>
					
					<div class="tracker-map summary-map" bind:this={mapContainer}>
						{#if !map}
							<div class="map-placeholder">Loading route…</div>
						{/if}
					</div>
					
					<div class="stats-grid summary-grid">
						<div class="stat-card">
							<div class="stat-label">Distance</div>
							<div class="stat-value">{formatDistance(totalDistance)}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Moving Time</div>
							<div class="stat-value">{formatTime(movingTime)}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Elapsed</div>
							<div class="stat-value">{formatTime(elapsedTime)}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">{activityType === 'bike' ? 'Avg Speed' : 'Avg Pace'}</div>
							<div class="stat-value">{activityType === 'bike' ? formatSpeed(avgSpeed) : `${avgPaceText} /mi`}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Max Speed</div>
							<div class="stat-value">{formatSpeed(maxSpeed)}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Elevation</div>
							<div class="stat-value">↗ {formatElevation(elevationGain)} ↘ {formatElevation(elevationLoss)}</div>
						</div>
					</div>
					
					<div class="form-group">
						<label for="trackNameFinish">Track Name</label>
						<input 
							id="trackNameFinish"
							type="text" 
							placeholder="e.g., River Loop Ride" 
							bind:value={trackName}
							class="form-input"
						/>
					</div>
					
					<div class="save-controls">
						<button class="save-btn" on:click={saveTrack} disabled={!trackName.trim()}>
							<Save size={20} />
							<span>Save to Field Journal</span>
						</button>
						<button class="export-btn" on:click={exportTrack}>
							📥 Export GPX
						</button>
						<button class="discard-btn" on:click={discardTrack}>
							<X size={16} />
							<span>Discard</span>
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	.tracker-content {
		padding: 1rem;
	}
	
	.start-screen {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.info-text {
		color: var(--card);
		opacity: 0.8;
		line-height: 1.5;
		margin: 0;
	}
	
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.form-group label,
	.group-label {
		font-weight: 600;
		color: var(--card);
	}
	
	.activity-picker {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}
	
	.activity-btn {
		padding: 0.6rem 0.25rem;
		border: 2px solid rgba(var(--card-rgb, 26, 43, 68), 0.2);
		border-radius: var(--button-radius, 8px);
		background: transparent;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.15s ease;
		color: var(--card);
	}
	
	.activity-btn.selected {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--text-light);
	}
	
	.autopause-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: var(--card);
		cursor: pointer;
	}
	
	.form-input, .form-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(var(--card-rgb, 26, 43, 68), 0.2);
		border-radius: 6px;
		font-size: 0.95rem;
		font-family: inherit;
	}
	
	.form-input:focus, .form-textarea:focus {
		outline: none;
		border-color: var(--primary);
	}
	
	.start-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--primary);
		color: var(--text-light);
		border: none;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 0.5rem;
	}
	
	.start-btn:hover {
		background: var(--secondary);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}
	
	.recording-screen,
	.summary-screen {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.summary-title {
		margin: 0;
		color: var(--card);
		font-size: 1.15rem;
	}
	
	.status-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		text-align: center;
		padding: 0.6rem;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1rem;
	}
	
	.status-indicator.recording {
		background: rgba(244, 67, 54, 0.1);
		color: #f44336;
		animation: pulse 2s infinite;
	}
	
	.status-indicator.paused {
		background: rgba(255, 152, 0, 0.1);
		color: #ff9800;
	}
	
	.gps-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.12);
		color: inherit;
	}
	
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}
	
	.hero-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	
	.hero-stat {
		text-align: center;
		padding: 0.75rem;
		border-radius: 10px;
		background: rgba(var(--card-rgb, 26, 43, 68), 0.06);
	}
	
	.hero-value {
		font-size: 1.9rem;
		font-weight: 800;
		color: var(--primary);
		font-variant-numeric: tabular-nums;
	}
	
	.hero-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--card);
		opacity: 0.7;
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}
	
	.summary-grid {
		grid-template-columns: repeat(2, 1fr);
	}
	
	.stat-card {
		background: rgba(var(--card-rgb, 26, 43, 68), 0.05);
		padding: 0.75rem;
		border-radius: 8px;
		text-align: center;
	}
	
	.stat-label {
		font-size: 0.78rem;
		color: var(--card);
		opacity: 0.7;
		margin-bottom: 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	
	.stat-value {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--primary);
		font-variant-numeric: tabular-nums;
	}
	
	.tracker-map {
		height: 230px;
		border-radius: 12px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.2);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
		position: relative;
	}
	
	.summary-map {
		height: 200px;
	}
	
	.map-placeholder {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.7);
	}
	
	.recenter-btn {
		position: absolute;
		bottom: 10px;
		right: 10px;
		z-index: 500;
		padding: 0.4rem 0.7rem;
		border: none;
		border-radius: 999px;
		background: var(--primary);
		color: var(--text-light);
		font-weight: 700;
		font-size: 0.8rem;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}
	
	.recording-controls {
		display: flex;
		gap: 1rem;
	}
	
	.control-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		border: none;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.pause-btn {
		background: var(--accent);
		color: var(--text-dark);
	}
	
	.pause-btn:hover {
		filter: brightness(1.1);
		transform: translateY(-2px);
	}
	
	.stop-btn {
		background: rgba(244, 67, 54, 0.85);
		color: white;
	}
	
	.stop-btn:hover {
		background: #f44336;
		transform: translateY(-2px);
	}
	
	.stop-btn span:first-child {
		font-size: 1.5rem;
		line-height: 1;
	}
	
	.save-controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.save-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--primary);
		color: var(--text-light);
		border: none;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.save-btn:hover:not(:disabled) {
		background: var(--secondary);
		transform: translateY(-2px);
	}
	
	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.export-btn {
		padding: 0.75rem;
		background: var(--accent);
		color: var(--text-dark);
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.export-btn:hover {
		filter: brightness(1.1);
		transform: translateY(-2px);
	}
	
	.discard-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.6rem;
		background: transparent;
		color: #f44336;
		border: 1px solid rgba(244, 67, 54, 0.5);
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}
	
	.discard-btn:hover {
		background: rgba(244, 67, 54, 0.08);
	}
	
	@media (max-width: 600px) {
		.recording-controls {
			flex-direction: column;
		}
	}
</style>
