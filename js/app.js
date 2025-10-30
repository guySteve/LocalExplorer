let map = null;
let placesService = null;
let geocoder = null;

let appInitialized = false;
let globalHandlersBound = false;
let mapsReady = false;

// Ensure DOM elements are ready before trying to use them
document.addEventListener('DOMContentLoaded', () => {
    bindGlobalHandlers();
    initApp();
    injectMapsScript();
});


function initApp() { 
      console.log("initApp called");
      if (appInitialized) {
          console.log("App already initialized.");
          return;
      }
      appInitialized = true;
      console.log("Initializing core app UI...");

      try {
          // Initialize ALL UI components that do not depend on Maps
          populateFilterButtons(); 
          initWeatherControls();
          initSettingsPanel(); 
          setupAccordions(); 
          initUiEvents(); // Bind button handlers etc.
          initDetailsSheetInteractions(); 
          
          // Speech Synthesis setup
          populateVoices();
          if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoices;
          }
          
          checkSharedPlan(); 

          // Provide manual input immediately as a fallback
          showManualInput();
          const locationDisplay = $("locationDisplay");
          if (locationDisplay) {
              locationDisplay.textContent = "Services loading...";
          }
          setWeatherPlaceholder('Provide a location to get started.');
          
          console.log("Core app initialization complete.");

      } catch (error) {
           console.error("Error during app initialization:", error);
           alert("An error occurred while starting the app. Please try refreshing.");
      }
}

function bindGlobalHandlers() {
      if (globalHandlersBound) return;
      globalHandlersBound = true;
      
      // Service Worker Registration
      if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('service-worker-v2.js')
              .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
              .catch(err => console.warn('ServiceWorker registration failed: ', err));
      }

      // Handle back button for modals/sheets
      window.addEventListener('popstate', () => {
          console.log("Popstate event detected.");
          let closedSomething = false;
          // Close active modals first
          document.querySelectorAll('.modal.active').forEach((modal) => {
              console.log(`Closing modal: ${modal.id}`);
              closeOverlayElement(modal); // Use helper to handle body class
              closedSomething = true;
          });
          // Close details sheet
          const detailsSheet = $("detailsSheet");
          if (detailsSheet?.classList.contains('active')) {
              console.log("Closing details sheet.");
              closeDetails(); // Assumes closeDetails handles body class
              closedSomething = true;
          }
          // Close compass overlay
          const compassOverlay = $("compassOverlay");
          const closeCompassBtn = $("closeCompassBtn");
          if (compassOverlay?.classList.contains('active') && closeCompassBtn) {
              console.log("Closing compass overlay via popstate.");
              closeCompassBtn.click(); // Trigger the existing close logic
              closedSomething = true;
          }
          
          // Ensure body class is removed if nothing is open
          if (!document.querySelector('.modal.active') && !detailsSheet?.classList.contains('active') && !compassOverlay?.classList.contains('active')) {
              document.body.classList.remove('modal-open');
          }
      });
}

function initMapServices() {
      if (mapsReady) return;
      if (typeof google === 'undefined' || !google.maps) {
          console.warn("Google Maps API not available yet. Retrying initMapServices shortly.");
          setTimeout(initMapServices, 50);
          return;
      }
      try {
          map = new google.maps.Map($("hiddenMap"), { center: { lat: 0, lng: 0 }, zoom: 15 });
          placesService = new google.maps.places.PlacesService(map);
          geocoder = new google.maps.Geocoder();
          mapsReady = true;
          console.log("Maps services initialized.");
          const locationDisplay = $("locationDisplay");
          if (locationDisplay) {
              locationDisplay.textContent = "Ready! Enable GPS or enter a location";
          }
          if (window.__pendingGeolocationPosition) {
              const queued = window.__pendingGeolocationPosition;
              window.__pendingGeolocationPosition = null;
              try {
                  onLocationSuccess(queued);
              } catch (err) {
                  console.error("Failed to process queued geolocation position:", err);
              }
          }
          requestGeolocation();
      } catch (error) {
           console.error("Error during Maps service initialization:", error);
           alert("Map services failed to load. Manual location input is required.");
           onLocationError({ message: "Map services failed to load." });
      }
}

function requestGeolocation() {
      if (!navigator.geolocation) {
          console.warn("Geolocation not supported.");
          onLocationError({ message: "Geolocation not supported." });
          return;
      }
      console.log("Requesting geolocation...");
      navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000
      });
}

// Google Maps callback function (must exist before the script loads)
window.initMap = initMapServices; 

// Function to inject the Google Maps script
function injectMapsScript() {
      // Prevent multiple injections
      if (document.querySelector('script[data-role="maps-api"]')) {
          console.log("Maps script already present.");
          // If script exists but initMap wasn't called (e.g., race condition), call it now if API is loaded
          if (typeof google !== 'undefined' && google.maps && !mapsReady) {
               console.log("Maps API already available, initializing services now.");
               initMapServices();
          }
          return;
      }
      
      console.log("Injecting Google Maps script...");
      const mapsKey = window.MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
      
      if (!mapsKey || mapsKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
           console.warn("Maps API Key is missing or using placeholder!");
           const locationDisplay = $("locationDisplay");
           if (locationDisplay) {
               locationDisplay.textContent = "Maps API key not configured. Please set MAPS_API_KEY.";
           }
           // Still allow manual input
           return;
      }

      const mapsScript = document.createElement('script');
      mapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places,geometry&callback=initMap`;
      mapsScript.async = true;
      mapsScript.defer = true;
      mapsScript.dataset.role = 'maps-api';
      mapsScript.addEventListener('load', () => {
           if (!mapsReady && typeof google !== 'undefined' && google.maps) {
               console.log("Maps script loaded (load event), initializing services.");
               initMapServices();
           }
      });
      mapsScript.onerror = () => {
           console.error("Failed to load Google Maps script!");
           alert("Error loading map services. Manual location input is required.");
           const locationDisplay = $("locationDisplay");
           if (locationDisplay) locationDisplay.textContent = "Map services failed to load.";
           onLocationError({ message: "Map script failed to load." });
      };
      document.head.appendChild(mapsScript);
}
