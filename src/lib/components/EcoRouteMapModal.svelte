<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { browser } from '$app/environment';

    export let visible = false;
    export let routeData = null;
    
    const dispatch = createEventDispatcher();
    const MAP_ID = 'd4bd73e784abf0f54cad41dc';
    
    let mapContainer;
    let map;
    let loading = true;
    let error = null;

    $: if (visible && browser && routeData) {
        initMap();
    }

    function closeModal() {
        dispatch('close');
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    }

    async function loadGoogleMaps() {
        if (window.google && window.google.maps && window.google.maps.marker) {
            return Promise.resolve();
        }
        
        return new Promise(async (resolve, reject) => {
            if (document.getElementById('google-maps-script-ecoroute')) {
                // Script is loading
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (window.google && window.google.maps && window.google.maps.marker) {
                        clearInterval(checkInterval);
                        resolve();
                    } else if (attempts > 50) { // 5 seconds
                        clearInterval(checkInterval);
                        reject(new Error('Google Maps script load timeout'));
                    }
                }, 100);
                return;
            }

            let apiKey = window.MAPS_API_KEY || ''; // Try window first
            
            // If missing on window, fetch from our dev endpoint
            if (!apiKey) {
                try {
                    const res = await fetch('/api/maps-key');
                    if (res.ok) {
                        const data = await res.json();
                        apiKey = data.key;
                    }
                } catch (e) {
                    console.warn('Could not fetch dev maps key:', e);
                }
            }
            
            if (!apiKey) {
                reject(new Error('Google Maps API key is missing. Set MAPS_API_KEY environment variable.'));
                return;
            }

            const script = document.createElement('script');
            script.id = 'google-maps-script-ecoroute';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=maps,marker`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Maps script'));
            document.head.appendChild(script);
        });
    }

    async function initMap() {
        try {
            loading = true;
            error = null;
            
            await loadGoogleMaps();
            
            if (!mapContainer) return;

            // Extract path and pois
            const path = routeData?.route?.path || [];
            const pois = routeData?.pois || [];
            
            if (path.length === 0) {
                error = 'No route path available to display.';
                loading = false;
                return;
            }

            // Calculate center
            const centerLat = path.reduce((sum, p) => sum + p.lat, 0) / path.length;
            const centerLng = path.reduce((sum, p) => sum + p.lng, 0) / path.length;

            map = new window.google.maps.Map(mapContainer, {
                center: { lat: centerLat, lng: centerLng },
                zoom: 14,
                mapId: MAP_ID,
                disableDefaultUI: false,
            });

            // Draw polyline
            const routePath = new window.google.maps.Polyline({
                path: path.map(p => ({ lat: p.lat, lng: p.lng })),
                geodesic: true,
                strokeColor: '#D45D3B', // Mid-century Burnt Orange
                strokeOpacity: 0.9,
                strokeWeight: 6,
            });
            routePath.setMap(map);

            // Add markers
            const { AdvancedMarkerElement, PinElement } = window.google.maps.marker;
            
            // Start pin
            const startPin = new PinElement({
                background: '#5F7151', // Olive Green
                borderColor: '#3A4830',
                glyphColor: 'white',
            });
            new AdvancedMarkerElement({
                map,
                position: { lat: path[0].lat, lng: path[0].lng },
                title: 'Start',
                content: startPin.element,
            });

            // End pin
            const endPin = new PinElement({
                background: '#D45D3B', // Burnt Orange
                borderColor: '#8A3A22',
                glyphColor: 'white',
            });
            new AdvancedMarkerElement({
                map,
                position: { lat: path[path.length - 1].lat, lng: path[path.length - 1].lng },
                title: 'End',
                content: endPin.element,
            });

            // POI markers
            pois.forEach(poi => {
                const poiPin = new PinElement({
                    background: '#E5A93D', // Mustard Yellow
                    borderColor: '#9E7220',
                    glyphColor: 'black',
                });
                
                const marker = new AdvancedMarkerElement({
                    map,
                    position: { lat: poi.lat, lng: poi.lng },
                    title: poi.desc || poi.type,
                    content: poiPin.element,
                });
                
                // Add info window
                const infoWindow = new window.google.maps.InfoWindow({
                    content: `<div style="padding: 8px; color: black;"><strong>${poi.type || 'POI'}</strong><br/>${poi.desc || ''}</div>`
                });
                
                marker.addListener('click', () => {
                    infoWindow.open({
                        anchor: marker,
                        map,
                    });
                });
            });

            // Adjust bounds
            const bounds = new window.google.maps.LatLngBounds();
            path.forEach(p => bounds.extend(new window.google.maps.LatLng(p.lat, p.lng)));
            pois.forEach(p => bounds.extend(new window.google.maps.LatLng(p.lat, p.lng)));
            map.fitBounds(bounds);
            
            loading = false;
        } catch (err) {
            console.error('Error initializing EcoRoute Map:', err);
            error = err.message || 'Failed to load map';
            loading = false;
        }
    }
</script>

<svelte:window on:keydown={(e) => visible && e.key === 'Escape' && closeModal()} />

{#if visible}
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal active" on:click={handleBackdropClick} transition:fade={{ duration: 200 }} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-content" transition:fly={{ y: 50, duration: 300 }} role="document">
        <div class="modal-header">
            <h3>EcoRoute Map</h3>
        </div>
        
        <div class="map-wrapper">
            {#if loading}
                <div class="status-overlay">
                    <div class="spinner"></div>
                    <p>Loading interactive map...</p>
                </div>
            {/if}
            
            {#if error}
                <div class="status-overlay error">
                    <p>⚠️ {error}</p>
                </div>
            {/if}
            
            <!-- Map container -->
            <div class="google-map" bind:this={mapContainer}></div>
        </div>
        
        <button class="close-btn-bottom" on:click|stopPropagation={closeModal} type="button" aria-label="Close Map">
            Close Map
        </button>
    </div>
</div>
{/if}

<style>
    .modal-content {
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        width: 100%;
        max-width: 800px;
        height: 80vh;
        background: rgba(253, 251, 250, 0.95);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(42, 40, 37, 0.1);
        border-radius: var(--radius);
        padding: 1.5rem;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    }
    
    .modal-header {
        flex-shrink: 0;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(42, 40, 37, 0.1);
        margin-bottom: 1rem;
    }

    h3 {
        margin: 0;
        color: var(--text-dark);
        font-family: var(--font-primary);
        font-size: 1.35rem;
    }
    
    .map-wrapper {
        flex: 1;
        position: relative;
        border-radius: var(--button-radius, 12px);
        overflow: hidden;
        border: 1px solid rgba(42, 40, 37, 0.15);
        min-height: 300px;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .google-map {
        width: 100%;
        height: 100%;
        background-color: #f0f0f0;
    }

    .status-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(253, 251, 250, 0.85);
        backdrop-filter: blur(8px);
        z-index: 10;
        color: var(--text-dark);
    }

    .status-overlay.error {
        background: rgba(253, 240, 240, 0.9);
        color: #D45D3B;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--accent);
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .close-btn-bottom {
        width: 100%;
        padding: 0.9rem;
        margin-top: 1rem;
        background: var(--text-dark);
        color: var(--text-light);
        border: none;
        border-radius: var(--button-radius);
        font-family: var(--font-primary);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        flex-shrink: 0;
    }
    
    .close-btn-bottom:hover {
        background: #1a1816;
        transform: translateY(-2px);
    }
</style>
