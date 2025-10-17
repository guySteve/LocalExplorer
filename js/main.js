/* js/main.js */
function initApp() {
  console.log("Google Maps API loaded.");
  AppState.load();

  const mapContainer = document.createElement('div'); // off-DOM for Places service
  AppState.services.places = new google.maps.places.PlacesService(mapContainer);
  AppState.services.geocoder = new google.maps.Geocoder();

  // Lightweight Street View backdrop
  AppState.services.panorama = new google.maps.StreetViewPanorama(
    document.getElementById('panorama-container'),
    { pov: { heading: 0, pitch: 0 }, zoom: 0, visible: false }
  );

  UI.init();

  // Register service worker (PWA/offline)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Try geolocation, else reveal manual entry
  if (navigator.geolocation) {
    UI.updateStatus("Getting location...");
    navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, { timeout: 8000 });
  } else {
    UI.updateStatus("Geolocation not supported.");
    UI.elements.manualEntry.classList.remove('hidden');
  }
}
// Ensure global for Google callback
window.initApp = initApp;

async function handleLocationSuccess(position) {
  const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
  AppState.currentUserLocation = coords;

  try {
    const results = await ApiService.geocode({ location: coords });
    const locality = results[0].formatted_address.split(',').slice(0, 2).join(',');
    UI.updateStatus(`Exploring: ${locality}`);
    const fact = await ApiService.getFunFact(coords);
    // If you later add a fun-fact element, set it here.
    // UI.elements.funFactText?.textContent = fact;
    // Try to show a pano if available, otherwise keep hidden
    const sv = new google.maps.StreetViewService();
    sv.getPanorama({ location: coords, radius: 100 }, (data, status) => {
      if (status === 'OK') {
        AppState.services.panorama.setPano(data.location.pano);
        AppState.services.panorama.setVisible(true);
      }
    });
  } catch {
    UI.updateStatus("Location found. Choose a category!");
  }
}

function handleLocationError() {
  UI.updateStatus("Location access denied. Enter a city to start.");
  UI.elements.manualEntry.classList.remove('hidden');
}

// Minimal controller for manual search
const Main = {
  async geocodeAddress() {
    const q = UI.elements.locationInput.value?.trim();
    if (!q) return;
    UI.updateStatus('Locating…');
    try {
      const results = await ApiService.geocode({ address: q });
      const best = results[0];
      const loc = best.geometry.location;
      AppState.currentUserLocation = { lat: loc.lat(), lng: loc.lng() };
      const city = best.formatted_address.split(',').slice(0, 2).join(',');
      UI.updateStatus(`Exploring: ${city}`);
    } catch {
      UI.updateStatus('Could not find that place.');
    }
  }
};
