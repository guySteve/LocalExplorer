<script>
	import { createEventDispatcher } from 'svelte';
	import { savedPlaces, dayPlan, customPOIs } from '$lib/stores/storage';
	import { exportToGPX, exportToGeoJSON, exportToCSV, importFromGPX } from '$lib/utils/exportImport';
	
	const dispatch = createEventDispatcher();
	
	// Props
	export let visible = false;
	
	// Tab state
	let activeTab = 'collection'; // 'collection', 'custom', or 'dayplan'
	
	// Drag and drop state for day plan
	let draggedIndex = null;
	
	// Custom POI creation
	let showAddCustomPOI = false;
	let newPOIName = '';
	let newPOINotes = '';
	let customPOILat = '';
	let customPOILng = '';
	
	// File import
	let fileInput;
	let importError = '';
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			dispatch('close');
		}
	}
	
	function handleClose() {
		dispatch('close');
		showAddCustomPOI = false;
		resetCustomPOIForm();
	}
	
	function switchTab(tab) {
		activeTab = tab;
		showAddCustomPOI = false;
		resetCustomPOIForm();
	}
	
	function removeFromCollection(placeId) {
		if (confirm('Remove this place from your collection?')) {
			savedPlaces.remove(placeId);
		}
	}
	
	function removeFromDayPlan(placeId) {
		if (confirm('Remove this place from your day plan?')) {
			dayPlan.remove(placeId);
		}
	}
	
	function startTrip() {
		if ($dayPlan.length === 0) {
			alert('Your day plan is empty. Add some places first!');
			return;
		}
		
		// Dispatch event to start compass with the day plan
		dispatch('startTrip', { stops: $dayPlan });
	}
	
	// Drag and drop handlers
	function handleDragStart(e, index) {
		draggedIndex = index;
		e.dataTransfer.effectAllowed = 'move';
		// Use plain text with index for security
		e.dataTransfer.setData('text/plain', index.toString());
	}
	
	function handleDragOver(e) {
		if (e.preventDefault) {
			e.preventDefault();
		}
		e.dataTransfer.dropEffect = 'move';
		return false;
	}
	
	function handleDrop(e, dropIndex) {
		if (e.stopPropagation) {
			e.stopPropagation();
		}
		
		if (draggedIndex !== null && draggedIndex !== dropIndex) {
			const items = [...$dayPlan];
			const draggedItem = items[draggedIndex];
			
			// Remove from old position
			items.splice(draggedIndex, 1);
			
			// Insert at new position
			items.splice(dropIndex, 0, draggedItem);
			
			// Update the store
			dayPlan.set(items);
		}
		
		draggedIndex = null;
		return false;
	}
	
	function handleDragEnd() {
		draggedIndex = null;
	}
	
	// Custom POI functions
	function showCustomPOIForm() {
		showAddCustomPOI = true;
	}
	
	function resetCustomPOIForm() {
		newPOIName = '';
		newPOINotes = '';
		customPOILat = '';
		customPOILng = '';
		showAddCustomPOI = false;
		importError = '';
	}
	
	function handleAddCustomPOI() {
		const lat = parseFloat(customPOILat);
		const lng = parseFloat(customPOILng);
		
		if (!newPOIName.trim()) {
			alert('Please enter a name for the POI');
			return;
		}
		
		if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
			alert('Please enter valid coordinates (Latitude: -90 to 90, Longitude: -180 to 180)');
			return;
		}
		
		customPOIs.add({
			name: newPOIName.trim(),
			location: { lat, lng },
			notes: newPOINotes.trim(),
			tags: []
		});
		
		resetCustomPOIForm();
	}
	
	function removeCustomPOI(poiId) {
		if (confirm('Remove this custom POI?')) {
			customPOIs.remove(poiId);
		}
	}
	
	// Export/Import functions
	function handleExportGPX() {
		try {
			const allPlaces = [...$savedPlaces, ...$customPOIs];
			if (allPlaces.length === 0) {
				alert('No places to export');
				return;
			}
			exportToGPX(allPlaces, `field-journal-${new Date().toISOString().split('T')[0]}.gpx`);
		} catch (error) {
			alert(`Export failed: ${error.message}`);
		}
	}
	
	function handleExportGeoJSON() {
		try {
			const allPlaces = [...$savedPlaces, ...$customPOIs];
			if (allPlaces.length === 0) {
				alert('No places to export');
				return;
			}
			exportToGeoJSON(allPlaces, `field-journal-${new Date().toISOString().split('T')[0]}.geojson`);
		} catch (error) {
			alert(`Export failed: ${error.message}`);
		}
	}
	
	function handleExportCSV() {
		try {
			const allPlaces = [...$savedPlaces, ...$customPOIs];
			if (allPlaces.length === 0) {
				alert('No places to export');
				return;
			}
			exportToCSV(allPlaces, `field-journal-${new Date().toISOString().split('T')[0]}.csv`);
		} catch (error) {
			alert(`Export failed: ${error.message}`);
		}
	}
	
	function handleImportClick() {
		fileInput.click();
	}
	
	async function handleFileImport(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		
		importError = '';
		
		try {
			if (!file.name.toLowerCase().endsWith('.gpx')) {
				throw new Error('Only GPX files are supported for import');
			}
			
			const places = await importFromGPX(file);
			
			if (places.length === 0) {
				throw new Error('No valid places found in GPX file');
			}
			
			// Add imported places as custom POIs
			places.forEach(place => {
				customPOIs.add(place);
			});
			
			alert(`Successfully imported ${places.length} place(s)`);
			switchTab('custom');
		} catch (error) {
			importError = error.message;
			alert(`Import failed: ${error.message}`);
		} finally {
			// Reset file input
			event.target.value = '';
		}
	}
</script>

{#if visible}
<div id="myCollectionModal" class="modal active" on:click={handleBackdropClick} role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && handleClose()}>
	<div class="modal-content" role="document">
		<div class="modal-header">
			<h3>⛰️ Field Journal</h3>
			<button class="close-btn" on:click={handleClose} type="button">×</button>
		</div>
		
		<!-- Tab Navigation -->
		<div class="tabs">
			<button 
				class="tab-btn" 
				class:active={activeTab === 'collection'}
				on:click={() => switchTab('collection')}
			>
				💾 Saved Places
			</button>
			<button 
				class="tab-btn" 
				class:active={activeTab === 'custom'}
				on:click={() => switchTab('custom')}
			>
				📍 Custom POIs
			</button>
			<button 
				class="tab-btn" 
				class:active={activeTab === 'dayplan'}
				on:click={() => switchTab('dayplan')}
			>
				📅 Day Plan
			</button>
		</div>
		
		<!-- Export/Import Buttons -->
		<div class="action-buttons">
			<button class="action-btn export-btn" on:click={handleExportGPX} title="Export to GPX">
				📥 Export GPX
			</button>
			<button class="action-btn export-btn" on:click={handleExportGeoJSON} title="Export to GeoJSON">
				📥 GeoJSON
			</button>
			<button class="action-btn export-btn" on:click={handleExportCSV} title="Export to CSV">
				📥 CSV
			</button>
			<button class="action-btn import-btn" on:click={handleImportClick} title="Import GPX">
				📤 Import GPX
			</button>
			<input 
				type="file" 
				accept=".gpx"
				bind:this={fileInput}
				on:change={handleFileImport}
				style="display: none;"
			/>
		</div>
		
		<!-- Tab Content -->
		<div id="listView" class="collection-view">
			{#if activeTab === 'collection'}
				<div class="results-list">
					{#if $savedPlaces.length > 0}
						{#each $savedPlaces as place}
							<div class="result-item">
								<div class="place-info">
									<h4>{place.name}</h4>
									<p>{place.formatted_address}</p>
								</div>
								<button 
									class="remove-btn" 
									on:click={() => removeFromCollection(place.place_id)}
									aria-label="Remove from collection"
									title="Remove"
								>
									×
								</button>
							</div>
						{/each}
					{:else}
						<div class="empty-state">Your saved places will appear here.</div>
					{/if}
				</div>
			{:else if activeTab === 'custom'}
				<div class="results-list">
					{#if !showAddCustomPOI}
						<button class="add-custom-btn" on:click={showCustomPOIForm}>
							+ Add Custom POI
						</button>
					{:else}
						<div class="custom-poi-form">
							<h4>Add Custom Point of Interest</h4>
							<input 
								type="text" 
								placeholder="POI Name" 
								bind:value={newPOIName}
								class="form-input"
							/>
							<input 
								type="number" 
								placeholder="Latitude (e.g., 40.7128)" 
								bind:value={customPOILat}
								step="any"
								class="form-input"
							/>
							<input 
								type="number" 
								placeholder="Longitude (e.g., -74.0060)" 
								bind:value={customPOILng}
								step="any"
								class="form-input"
							/>
							<textarea 
								placeholder="Notes (optional)" 
								bind:value={newPOINotes}
								class="form-textarea"
								rows="3"
							></textarea>
							<div class="form-buttons">
								<button class="save-btn" on:click={handleAddCustomPOI}>Save POI</button>
								<button class="cancel-btn" on:click={resetCustomPOIForm}>Cancel</button>
							</div>
						</div>
					{/if}
					
					{#if $customPOIs.length > 0}
						{#each $customPOIs as poi}
							<div class="result-item custom-poi-item">
								<div class="place-info">
									<h4>📍 {poi.name}</h4>
									<p>{poi.location.lat.toFixed(5)}, {poi.location.lng.toFixed(5)}</p>
									{#if poi.notes}
										<p class="poi-notes">{poi.notes}</p>
									{/if}
								</div>
								<button 
									class="remove-btn" 
									on:click={() => removeCustomPOI(poi.id)}
									aria-label="Remove custom POI"
									title="Remove"
								>
									×
								</button>
							</div>
						{/each}
					{:else if !showAddCustomPOI}
						<div class="empty-state">No custom POIs yet. Add your first!</div>
					{/if}
				</div>
			{:else}
				<div class="results-list day-plan-list">
					{#if $dayPlan.length > 0}
						{#each $dayPlan as place, index (place.place_id)}
							<div 
								class="result-item draggable"
								draggable="true"
								on:dragstart={(e) => handleDragStart(e, index)}
								on:dragover={handleDragOver}
								on:drop={(e) => handleDrop(e, index)}
								on:dragend={handleDragEnd}
							>
								<div class="drag-handle" aria-label="Drag to reorder">☰</div>
								<div class="place-info">
									<div class="stop-number">Stop {index + 1}</div>
									<h4>{place.name}</h4>
									<p>{place.formatted_address}</p>
								</div>
								<button 
									class="remove-btn" 
									on:click={() => removeFromDayPlan(place.place_id)}
									aria-label="Remove from day plan"
									title="Remove"
								>
									×
								</button>
							</div>
						{/each}
						
						<button class="start-trip-btn" on:click={startTrip}>
							<span class="compass-icon" aria-hidden="true"></span> Start This Trip
						</button>
					{:else}
						<div class="empty-state">Add places to your day plan to build your trip.</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	/* Component-specific styles scoped by default */
	.collection-view {
		max-height: 60vh;
		overflow-y: auto;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}
	
	.results-list {
		overflow-y: auto;
		max-height: 100%;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}
	
	.tabs {
		display: flex;
		gap: 0.5rem;
		padding: 0 1rem;
		border-bottom: 2px solid rgba(var(--card-rgb, 26, 43, 68), 0.1);
		margin-bottom: 1rem;
	}
	
	.tab-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		border: none;
		border-bottom: 3px solid transparent;
		background: transparent;
		color: var(--card);
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.3s ease;
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
	
	.result-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(var(--card-rgb, 26, 43, 68), 0.03);
		border-radius: 8px;
		margin-bottom: 0.75rem;
		transition: all 0.2s ease;
	}
	
	.result-item:hover {
		background: rgba(var(--card-rgb, 26, 43, 68), 0.08);
		transform: translateX(4px);
	}
	
	.result-item.draggable {
		cursor: move;
	}
	
	.result-item.draggable:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.drag-handle {
		font-size: 1.5rem;
		color: var(--accent);
		cursor: grab;
		user-select: none;
		padding: 0.25rem;
	}
	
	.drag-handle:active {
		cursor: grabbing;
	}
	
	.place-info {
		flex: 1;
	}
	
	.stop-number {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--primary);
		text-transform: uppercase;
		margin-bottom: 0.25rem;
	}
	
	.place-info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--card);
	}
	
	.place-info p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--card);
		opacity: 0.7;
	}
	
	.remove-btn {
		background: rgba(244, 67, 54, 0.1);
		border: 1px solid rgba(244, 67, 54, 0.3);
		color: #f44336;
		border-radius: 50%;
		width: 32px;
		height: 32px;
		font-size: 1.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		padding: 0;
		transition: all 0.2s ease;
	}
	
	.remove-btn:hover {
		background: rgba(244, 67, 54, 0.2);
		border-color: #f44336;
		transform: scale(1.1);
	}
	
	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--card);
		opacity: 0.6;
		font-style: italic;
	}
	
	.start-trip-btn {
		width: 100%;
		padding: 1rem;
		margin-top: 1rem;
		background: var(--primary);
		color: var(--text-light);
		border: none;
		border-radius: var(--button-radius, 12px);
		font-weight: 700;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 4px 12px rgba(var(--primary-rgb, 200, 121, 65), 0.3);
	}
	
	.start-trip-btn:hover {
		background: var(--secondary);
		transform: translateY(-2px);
		box-shadow: 0 6px 18px rgba(var(--primary-rgb, 200, 121, 65), 0.4);
	}
	
	.start-trip-btn:active {
		transform: translateY(0);
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
	
	/* Action buttons for export/import */
	.action-buttons {
		display: flex;
		gap: 0.5rem;
		padding: 0 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}
	
	.action-btn {
		flex: 1;
		min-width: 100px;
		padding: 0.5rem 0.75rem;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.export-btn {
		background: var(--primary);
		color: var(--text-light);
	}
	
	.export-btn:hover {
		background: var(--secondary);
		transform: translateY(-2px);
	}
	
	.import-btn {
		background: var(--accent);
		color: var(--text-dark);
	}
	
	.import-btn:hover {
		filter: brightness(1.1);
		transform: translateY(-2px);
	}
	
	/* Custom POI form */
	.add-custom-btn {
		width: 100%;
		padding: 1rem;
		margin-bottom: 1rem;
		background: var(--primary);
		color: var(--text-light);
		border: none;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.add-custom-btn:hover {
		background: var(--secondary);
		transform: translateY(-2px);
	}
	
	.custom-poi-form {
		background: rgba(var(--card-rgb, 26, 43, 68), 0.05);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}
	
	.custom-poi-form h4 {
		margin: 0 0 1rem 0;
		color: var(--card);
	}
	
	.form-input, .form-textarea {
		width: 100%;
		padding: 0.75rem;
		margin-bottom: 0.75rem;
		border: 2px solid rgba(var(--card-rgb, 26, 43, 68), 0.2);
		border-radius: 6px;
		font-size: 0.95rem;
		font-family: inherit;
	}
	
	.form-input:focus, .form-textarea:focus {
		outline: none;
		border-color: var(--primary);
	}
	
	.form-buttons {
		display: flex;
		gap: 0.5rem;
	}
	
	.save-btn, .cancel-btn {
		flex: 1;
		padding: 0.75rem;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.save-btn {
		background: var(--primary);
		color: var(--text-light);
	}
	
	.save-btn:hover {
		background: var(--secondary);
	}
	
	.cancel-btn {
		background: rgba(var(--card-rgb, 26, 43, 68), 0.1);
		color: var(--card);
	}
	
	.cancel-btn:hover {
		background: rgba(var(--card-rgb, 26, 43, 68), 0.2);
	}
	
	.custom-poi-item {
		border-left: 3px solid var(--primary);
	}
	
	.poi-notes {
		font-size: 0.85rem;
		font-style: italic;
		opacity: 0.8;
		margin-top: 0.25rem;
	}
</style>
