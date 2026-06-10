<script>
	import { currentPosition, latestLocationLabel, currentAddress } from '$lib/stores/appState';
	
	export let locationDisplay = 'Determining your location…';
	
	$: coords = $currentPosition 
		? `${$currentPosition.lat.toFixed(4)}°, ${$currentPosition.lng.toFixed(4)}°`
		: null;

	function requestLocation() {
		if (!navigator.geolocation) {
			alert('Geolocation is not supported by your browser.');
			return;
		}
		
		latestLocationLabel.set('Locating...');
		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
				currentPosition.set(pos);
				
				try {
					const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&zoom=10&addressdetails=1`, {
						headers: { 'User-Agent': 'LocalExplorer/1.0' }
					});
					const data = await res.json();
					if (data.address) {
						const city = data.address.city || data.address.town || data.address.village || '';
						const state = data.address.state || '';
						const locStr = city && state ? `${city}, ${state}` : city || state || data.display_name;
						latestLocationLabel.set(locStr);
						currentAddress.set(data.display_name || '');
					}
				} catch (e) {}
			},
			(err) => {
				alert('Location access denied. Please allow location permissions.');
				latestLocationLabel.set('Location unavailable');
			},
			{ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
		);
	}
</script>

<div id="locationDisplay">
	<div class="location-header">
		<div class="location-city">{locationDisplay}</div>
		{#if !$currentPosition}
			<button class="locate-btn" on:click={requestLocation}>
				📍 Locate Me
			</button>
		{/if}
	</div>
	{#if coords}
		<div class="location-coords">{coords}</div>
	{/if}
</div>

<style>
	.location-city {
		font-weight: 600;
	}
	
	.location-coords {
		font-size: 0.75rem;
		opacity: 0.7;
		margin-top: 0.15rem;
	}
</style>
