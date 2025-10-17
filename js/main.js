/***************************************************************************************************
* MAIN APPLICATION ENTRY POINT
*
* This script orchestrates the initialization of the entire application.
* The `initApp` function is the global callback executed by the Google Maps API script
* once it has finished loading.
***************************************************************************************************/

/**
 * The global callback function called by the Google Maps script.
 * This function is the main entry point for our application logic.
 */
function initApp() {
    console.log("Google Maps API loaded. Initializing application.");

    // 1. Initialize Application State
    // Load any saved data from localStorage into our state manager.
    AppState.load();

    // 2. Initialize Google Maps Services
    // Create instances of the services we need and store them in our state.
    const mapContainer = document.createElement('div'); // A dummy element for the services
    AppState.services.places = new google.maps.places.PlacesService(mapContainer);
    AppState.services.geocoder = new google.maps.Geocoder();
    AppState.services.directions = new google.maps.DirectionsService();
    // Assuming a 'panorama-container' div exists in the HTML
    AppState.services.panorama = new google.maps.StreetViewPanorama(document.getElementById('panorama-container'));

    // 3. Initialize the User Interface
    // Cache DOM elements and set up all event listeners.
    UI.init();

    // 4. Get User's Location
    // Start the process of geolocation.
    if (navigator.geolocation) {
        UI.updateStatus("Getting your location...");
        navigator.geolocation.getCurrentPosition(
            handleLocationSuccess,
            handleLocationError,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        UI.updateStatus("Geolocation is not supported by your browser.");
        // Optionally, show a manual location input here.
    }
}

/**
 * Handles a successful geolocation call.
 * @param {GeolocationPosition} position The position object from the browser.
 */
async function handleLocationSuccess(position) {
    const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
    };
    AppState.currentUserLocation = coords;
    
    try {
        // Reverse geocode to get a human-readable location name
        const results = await ApiService.geocode({ location: coords });
        if (results && results[0]) {
            AppState.currentLocality = results[0].formatted_address.split(',').slice(0, 2).join(',');
            UI.updateStatus(`Exploring: ${AppState.currentLocality}`);
        } else {
            UI.updateStatus("Location found. Choose a category!");
        }

        // Fetch a fun fact for the new location
        const fact = await ApiService.getFunFact(coords);
        UI.elements.funFactText.textContent = fact;

    } catch (error) {
        UI.updateStatus("Could not identify your location name.");
    }
}

/**
 * Handles a failed geolocation call.
 * @param {GeolocationPositionError} error The error object from the browser.
 */
function handleLocationError(error) {
    console.error("Geolocation Error:", error);
    UI.updateStatus("Location access denied. Please enable it in your browser settings.");
}
