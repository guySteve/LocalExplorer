<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { Download, Database, Trash2, MapPin } from 'lucide-svelte';
	import { initDB, getDBStats, bulkInsertPOIs, clearPOIs } from '$lib/utils/indexedDB';
	import { 
		downloadRegionTiles, 
		getCachedTileCount, 
		clearTileCache, 
		getCacheSize 
	} from '$lib/utils/offlineTiles';
	import { currentPosition } from '$lib/stores/appState';
	
	const dispatch = createEventDispatcher();
	
	export let visible = false;
	
	let activeTab = 'tiles'; // 'tiles' or 'data'
	let dbStats = { totalPOIs: 0 };
	let cacheStats = { tileCount: 0, sizeBytes: 0 };
	let isLoading = false;
	let error = '';
	
	// Tile download state
	let downloadInProgress = false;
	let downloadProgress = { current: 0, total: 0, success: 0, failed: 0 };
	let regionRadius = 5; // km
	let minZoom = 12;
	let maxZoom = 15;
	let selectedProvider = 'osm';
	
	onMount(() => {
		if (visible) {
			loadStats();
		}
	});
	
	$: if (visible) {
		loadStats();
	}
	
	async function loadStats() {
		try {
			isLoading = true;
			error = '';
			
			// Load database stats
			await initDB();
			dbStats = await getDBStats();
			
			// Load cache stats
			const tileCount = await getCachedTileCount();
			const sizeBytes = await getCacheSize();
			cacheStats = { tileCount, sizeBytes };
			
		} catch (err) {
			console.error('Error loading stats:', err);
			error = err.message;
		} finally {
			isLoading = false;
		}
	}
	
	async function downloadRegion() {
		if (!$currentPosition) {
			error = 'Location required. Please enable location services.';
			return;
		}
		
		if (downloadInProgress) return;
		
		try {
			downloadInProgress = true;
			error = '';
			downloadProgress = { current: 0, total: 0, success: 0, failed: 0 };
			
			const { lat, lng } = $currentPosition;
			
			// Calculate bounds (simple box around current position)
			const kmPerDegLat = 111;
			const kmPerDegLng = 111 * Math.cos(lat * Math.PI / 180);
			
			const latDelta = regionRadius / kmPerDegLat;
			const lngDelta = regionRadius / kmPerDegLng;
			
			const bounds = {
				north: lat + latDelta,
				south: lat - latDelta,
				east: lng + lngDelta,
				west: lng - lngDelta
			};
			
			const results = await downloadRegionTiles({
				bounds,
				minZoom,
				maxZoom,
				provider: selectedProvider,
				onProgress: (progress) => {
					downloadProgress = progress;
				}
			});
			
			await loadStats();
			
			if (results.failed > 0) {
				error = `Downloaded ${results.success} tiles, ${results.failed} failed`;
			}
			
		} catch (err) {
			console.error('Error downloading region:', err);
			error = err.message;
		} finally {
			downloadInProgress = false;
		}
	}
	
	async function clearTiles() {
		if (!confirm('Clear all cached map tiles? This will require re-downloading tiles for offline use.')) {
			return;
		}
		
		try {
			isLoading = true;
			error = '';
			
			await clearTileCache();
			await loadStats();
			
		} catch (err) {
			console.error('Error clearing tiles:', err);
			error = err.message;
		} finally {
			isLoading = false;
		}
	}
	
	async function clearData() {
		if (!confirm('Clear all offline POI data? This cannot be undone.')) {
			return;
		}
		
		try {
			isLoading = true;
			error = '';
			
			await clearPOIs();
			await loadStats();
			
		} catch (err) {
			console.error('Error clearing data:', err);
			error = err.message;
		} finally {
			isLoading = false;
		}
	}
	
	function formatBytes(bytes) {
		if (bytes === 0) return '0 Bytes';
		
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			dispatch('close');
		}
	}
	
	function handleClose() {
		dispatch('close');
	}
</script>

{#if visible}
<div class="modal active" on:click={handleBackdropClick} role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && handleClose()}>
	<div class="modal-content" role="document">
		<div class="modal-header">
			<h3>⚡ Offline Manager</h3>
			<button class="close-btn" on:click={handleClose} type="button">×</button>
		</div>
		
		<!-- Tabs -->
		<div class="tabs">
			<button 
				class="tab-btn" 
				class:active={activeTab === 'tiles'}
				on:click={() => activeTab = 'tiles'}
			>
				<MapPin size={16} />
				<span>Map Tiles</span>
			</button>
			<button 
				class="tab-btn" 
				class:active={activeTab === 'data'}
				on:click={() => activeTab = 'data'}
			>
				<Database size={16} />
				<span>POI Data</span>
			</button>
		</div>
		
		<div class="content">
			{#if error}
				<div class="error-banner">{error}</div>
			{/if}
			
			{#if activeTab === 'tiles'}
				<div class="section">
					<h4>Download Map Tiles</h4>
					<p class="info-text">Download map tiles for offline use. Tiles are cached in your browser.</p>
					
					<div class="form-group">
						<label for="provider">Map Type</label>
						<select id="provider" bind:value={selectedProvider}>
							<option value="osm">OpenStreetMap</option>
							<option value="topo">Topographic</option>
							<option value="satellite">Satellite</option>
						</select>
					</div>
					
					<div class="form-group">
						<label for="radius">Region Radius: {regionRadius} km</label>
						<input 
							type="range" 
							id="radius"
							min="1" 
							max="20" 
							bind:value={regionRadius}
							class="slider"
						/>
					</div>
					
					<div class="form-row">
						<div class="form-group">
							<label for="minZoom">Min Zoom: {minZoom}</label>
							<input 
								type="range" 
								id="minZoom"
								min="8" 
								max="15" 
								bind:value={minZoom}
								class="slider"
							/>
						</div>
						<div class="form-group">
							<label for="maxZoom">Max Zoom: {maxZoom}</label>
							<input 
								type="range" 
								id="maxZoom"
								min="10" 
								max="18" 
								bind:value={maxZoom}
								class="slider"
							/>
						</div>
					</div>
					
					{#if downloadInProgress}
						<div class="progress-section">
							<div class="progress-bar">
								<div 
									class="progress-fill" 
									style="width: {(downloadProgress.current / downloadProgress.total) * 100}%"
								></div>
							</div>
							<p class="progress-text">
								{downloadProgress.current} / {downloadProgress.total} tiles
								({downloadProgress.success} success, {downloadProgress.failed} failed)
							</p>
						</div>
					{:else}
						<button 
							class="action-btn primary" 
							on:click={downloadRegion}
							disabled={!$currentPosition || isLoading}
						>
							<Download size={20} />
							<span>Download Region</span>
						</button>
					{/if}
					
					<div class="stats-section">
						<h4>Cache Statistics</h4>
						<div class="stats-grid">
							<div class="stat-item">
								<span class="stat-label">Cached Tiles</span>
								<span class="stat-value">{cacheStats.tileCount}</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">Cache Size</span>
								<span class="stat-value">{formatBytes(cacheStats.sizeBytes)}</span>
							</div>
						</div>
						
						{#if cacheStats.tileCount > 0}
							<button class="action-btn danger" on:click={clearTiles} disabled={isLoading}>
								<Trash2 size={16} />
								<span>Clear Tile Cache</span>
							</button>
						{/if}
					</div>
				</div>
			{:else}
				<div class="section">
					<h4>POI Database</h4>
					<p class="info-text">Local database for offline point of interest data.</p>
					
					<div class="stats-section">
						<div class="stats-grid">
							<div class="stat-item">
								<span class="stat-label">Total POIs</span>
								<span class="stat-value">{dbStats.totalPOIs}</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">Database Version</span>
								<span class="stat-value">v{dbStats.dbVersion}</span>
							</div>
						</div>
						
						{#if dbStats.totalPOIs > 0}
							<button class="action-btn danger" on:click={clearData} disabled={isLoading}>
								<Trash2 size={16} />
								<span>Clear POI Data</span>
							</button>
						{/if}
					</div>
					
					<div class="info-box">
						<p><strong>Coming Soon:</strong></p>
						<ul>
							<li>Sync POI data from online sources</li>
							<li>Import POI datasets</li>
							<li>Export local database</li>
						</ul>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	.content {
		padding: 1rem;
		max-height: 60vh;
		overflow-y: auto;
	}
	
	.tabs {
		display: flex;
		border-bottom: 2px solid rgba(var(--card-rgb, 26, 43, 68), 0.1);
	}
	
	.tab-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border: none;
		border-bottom: 3px solid transparent;
		background: transparent;
		color: var(--card);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		opacity: 0.6;
	}
	
	.tab-btn:hover {
		opacity: 0.8;
		background: rgba(var(--card-rgb, 26, 43, 68), 0.05);
	}
	
	.tab-btn.active {
		opacity: 1;
		border-bottom-color: var(--primary);
	}
	
	.section {
		margin-bottom: 2rem;
	}
	
	.section h4 {
		margin: 0 0 0.5rem 0;
		color: var(--card);
	}
	
	.info-text {
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
		color: var(--card);
		opacity: 0.8;
	}
	
	.form-group {
		margin-bottom: 1rem;
	}
	
	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: var(--card);
	}
	
	.form-group select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(var(--card-rgb, 26, 43, 68), 0.2);
		border-radius: 6px;
		font-size: 0.95rem;
		background: white;
	}
	
	.slider {
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: rgba(var(--card-rgb, 26, 43, 68), 0.2);
		outline: none;
		-webkit-appearance: none;
	}
	
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--primary);
		cursor: pointer;
	}
	
	.slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--primary);
		cursor: pointer;
		border: none;
	}
	
	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	
	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 0.5rem;
	}
	
	.action-btn.primary {
		background: var(--primary);
		color: var(--text-light);
	}
	
	.action-btn.primary:hover:not(:disabled) {
		background: var(--secondary);
		transform: translateY(-2px);
	}
	
	.action-btn.danger {
		background: rgba(244, 67, 54, 0.1);
		color: #f44336;
		border: 1px solid rgba(244, 67, 54, 0.3);
	}
	
	.action-btn.danger:hover:not(:disabled) {
		background: rgba(244, 67, 54, 0.2);
		border-color: #f44336;
	}
	
	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.progress-section {
		margin: 1rem 0;
	}
	
	.progress-bar {
		width: 100%;
		height: 8px;
		background: rgba(var(--card-rgb, 26, 43, 68), 0.1);
		border-radius: 4px;
		overflow: hidden;
	}
	
	.progress-fill {
		height: 100%;
		background: var(--primary);
		transition: width 0.3s ease;
	}
	
	.progress-text {
		margin: 0.5rem 0 0 0;
		font-size: 0.85rem;
		color: var(--card);
		text-align: center;
	}
	
	.stats-section {
		margin-top: 1.5rem;
		padding: 1rem;
		background: rgba(var(--card-rgb, 26, 43, 68), 0.03);
		border-radius: 8px;
	}
	
	.stats-section h4 {
		margin: 0 0 1rem 0;
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	
	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.75rem;
		background: white;
		border-radius: 6px;
	}
	
	.stat-label {
		font-size: 0.8rem;
		color: var(--card);
		opacity: 0.7;
		margin-bottom: 0.25rem;
	}
	
	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--primary);
	}
	
	.error-banner {
		padding: 0.75rem;
		margin-bottom: 1rem;
		background: rgba(244, 67, 54, 0.1);
		color: #f44336;
		border-left: 4px solid #f44336;
		border-radius: 4px;
	}
	
	.info-box {
		margin-top: 1.5rem;
		padding: 1rem;
		background: rgba(var(--accent-rgb, 251, 221, 157), 0.1);
		border-left: 4px solid var(--accent);
		border-radius: 4px;
	}
	
	.info-box p {
		margin: 0 0 0.5rem 0;
		font-weight: 600;
	}
	
	.info-box ul {
		margin: 0;
		padding-left: 1.5rem;
	}
	
	.info-box li {
		margin-bottom: 0.25rem;
	}
</style>
