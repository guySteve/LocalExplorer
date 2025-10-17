function initApp() {
    console.log("Google Maps API loaded.");
    AppState.load();
    const mapContainer = document.createElement('div');
    AppState.services.places = new google.maps.places.PlacesService(mapContainer);
    AppState.services.geocoder = new google.maps.Geocoder();
    AppState.services.panorama = new google.maps.StreetViewPanorama(document.getElementById('panorama-container'));
    UI.init();
    
    if (navigator.geolocation) {
        UI.updateStatus("Getting location...");
        navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError);
    } else {
        UI.updateStatus("Geolocation not supported.");
    }
}

async function handleLocationSuccess(position) {
    const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
    AppState.currentUserLocation = coords;
    try {
        const results = await ApiService.geocode({ location: coords });
        const locality = results[0].formatted_address.split(',').slice(0, 2).join(',');
        UI.updateStatus(`Exploring: ${locality}`);
        const fact = await ApiService.getFunFact(coords);
        UI.elements.funFactText.textContent = fact;
    } catch {
        UI.updateStatus("Location found. Choose a category!");
    }
}

function handleLocationError() {
    UI.updateStatus("Location access denied.");
}
