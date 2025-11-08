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
	
	let isRecording = false;
	let isPaused = false;
	let trackPoints = [];
	let startTime = null;
	let elapsedTime = 0;
	let totalDistance = 0;
	let trackName = '';
	let trackNotes = '';
	let watchId = null;
	let intervalId = null;
	let lastPosition = null;
	
	const DEFAULT_CENTER = [37.7749, -122.4194];
	let map;
	let mapContainer;
	let tileToggleControl = null;
	let trackPolyline = null;
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}
	
	function handleClose() {
		if (isRecording && !confirm('Stop recording and discard this track?')) {
			return;
		}
		stopRecording();
		dispatch('close');
	}
	
	function startRecording() {
		if (!navigator.geolocation) {
			alert('Geolocation is not supported by your browser');
			return;
		}
		
		isRecording = true;
		isPaused = false;
		startTime = Date.now();
		trackPoints = [];
		totalDistance = 0;
		lastPosition = null;
		
		// Start watching position
		watchId = navigator.geolocation.watchPosition(
			handlePositionUpdate,
			handlePositionError,
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 0
			}
		);
		
		// Update elapsed time every second
		intervalId = setInterval(() => {
			if (!isPaused) {
				elapsedTime = Date.now() - startTime;
			}
		}, 1000);
	}
	
	function pauseRecording() {
		isPaused = !isPaused;
	}
	
	function stopRecording() {
		if (watchId !== null) {
			navigator.geolocation.clearWatch(watchId);
			watchId = null;
		}
		
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
		
		isRecording = false;
		isPaused = false;
	}
	
	function handlePositionUpdate(position) {
		if (isPaused) return;
		
		const point = {
			lat: position.coords.latitude,
			lng: position.coords.longitude,
			timestamp: position.timestamp,
			accuracy: position.coords.accuracy,
			elevation: position.coords.altitude || null
		};
		
		// Calculate distance from last point
		if (lastPosition) {
			const distance = calculateDistance(
				lastPosition.lat,
				lastPosition.lng,
				point.lat,
				point.lng
			);
			
			// Only add point if moved more than 5 meters (filter GPS noise)
			if (distance > 5) {
				totalDistance += distance;
				trackPoints = [...trackPoints, point];
				lastPosition = point;
			}
		} else {
			trackPoints = [...trackPoints, point];
			lastPosition = point;
		}
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
		const R = 6371000; // Earth's radius in meters
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLng = (lng2 - lng1) * Math.PI / 180;
		const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		          Math.sin(dLng/2) * Math.sin(dLng/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		return R * c;
	}
	
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
		map = createMap(mapContainer, { center: [lat, lng], zoom: 14, zoomControl: false });
		tileToggleControl = attachTileToggle(map);
		setTimeout(() => map?.invalidateSize(), 100);
		if (trackPoints.length > 0) {
			updateMapTrack();
		}
	}
	
	function destroyMap() {
		clearMapTrack();
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
				color: '#ff6b6b',
				weight: 4,
				opacity: 0.85
			}).addTo(map);
		} else {
			trackPolyline.setLatLngs(latLngs);
		}
		
		const bounds = trackPolyline.getBounds();
		if (bounds.isValid()) {
			map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
		}
	}
	
	function clearMapTrack() {
		if (trackPolyline && map) {
			map.removeLayer(trackPolyline);
		}
		trackPolyline = null;
	}
	
	function saveTrack() {
		if (trackPoints.length === 0) {
			alert('No track data to save');
			return;
		}
		
		if (!trackName.trim()) {
			alert('Please enter a name for this track');
			return;
		}
		
		stopRecording();
		
		const trackId = gpsTracks.add({
			name: trackName.trim(),
			points: trackPoints,
			distance: totalDistance,
			duration: elapsedTime,
			notes: trackNotes.trim()
		});
		
		alert(`Track "${trackName}" saved to Field Journal!`);
		resetTrack();
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
	
	function resetTrack() {
		trackPoints = [];
		totalDistance = 0;
		elapsedTime = 0;
		trackName = '';
		trackNotes = '';
		startTime = null;
		lastPosition = null;
		clearMapTrack();
	}
	
	function formatTime(ms) {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		
		const s = seconds % 60;
		const m = minutes % 60;
		
		if (hours > 0) {
			return `${hours}h ${m}m ${s}s`;
		} else if (minutes > 0) {
			return `${m}m ${s}s`;
		} else {
			return `${s}s`;
		}
	}
	
	function formatDistance(meters) {
		if (meters >= 1000) {
			return `${(meters / 1000).toFixed(2)} km`;
		} else {
			return `${meters.toFixed(0)} m`;
		}
	}
	
	$: if (visible && isRecording && mapContainer) {
		initMap();
	} else if ((!visible || !isRecording) && map) {
		clearMapTrack();
		destroyMap();
	}
	
	$: if (map && trackPoints.length > 0) {
		updateMapTrack();
	}
	
	$: if (map && trackPoints.length === 0) {
		clearMapTrack();
	}
	
onDestroy(() => {
	stopRecording();
});
</script>

<svelte:window on:keydown={(e) => visible && e.key === 'Escape' && handleClose()} />

{#if visible}
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal active" on:click={handleBackdropClick} role="dialog" aria-modal="true" tabindex="-1">
	<div class="modal-content" role="document">
		<div class="modal-header">
			<h3>🗺️ GPS Track Recorder</h3>
			<button class="close-btn" on:click={handleClose} type="button">×</button>
		</div>
		
		<div class="tracker-content">
			{#if !isRecording}
				<div class="start-screen">
					<p class="info-text">Record your path as you explore. GPS tracks are saved to your Field Journal and can be exported as GPX files.</p>
					
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
							rows="3"
						></textarea>
					</div>
					
					<button class="start-btn" on:click={startRecording}>
						<Play size={20} />
						<span>Start Recording</span>
					</button>
				</div>
			{:else}
				<div class="recording-screen">
					<div class="status-indicator {isPaused ? 'paused' : 'recording'}">
						{isPaused ? '⏸️ Paused' : '🔴 Recording'}
					</div>
					
					<div class="stats-grid">
						<div class="stat-card">
							<div class="stat-label">Duration</div>
							<div class="stat-value">{formatTime(elapsedTime)}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Distance</div>
							<div class="stat-value">{formatDistance(totalDistance)}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Points</div>
							<div class="stat-value">{trackPoints.length}</div>
						</div>
					</div>
					
					<div class="tracker-map" bind:this={mapContainer}>
						{#if !map}
							<div class="map-placeholder">Map warming up…</div>
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
						
						<button class="control-btn stop-btn" on:click={stopRecording}>
							<span>■</span>
							<span>Stop</span>
						</button>
					</div>
					
					{#if !isRecording && trackPoints.length > 0}
						<div class="save-controls">
							<button class="save-btn" on:click={saveTrack} disabled={!trackName.trim()}>
								<Save size={20} />
								<span>Save to Field Journal</span>
							</button>
							<button class="export-btn" on:click={exportTrack}>
								📥 Export GPX
							</button>
						</div>
					{/if}
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
	
	.form-group label {
		font-weight: 600;
		color: var(--card);
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
	
	.recording-screen {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.status-indicator {
		text-align: center;
		padding: 0.75rem;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1.1rem;
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
	
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}
	
	.stat-card {
		background: rgba(var(--card-rgb, 26, 43, 68), 0.05);
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
	}
	
	.stat-label {
		font-size: 0.85rem;
		color: var(--card);
		opacity: 0.7;
		margin-bottom: 0.5rem;
	}
	
	.stat-value {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--primary);
	}
	
	.tracker-map {
		margin-top: 1.25rem;
		height: 230px;
		border-radius: 12px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.2);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
		position: relative;
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
	
	@media (max-width: 600px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
		
		.recording-controls {
			flex-direction: column;
		}
	}
</style>
