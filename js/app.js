let appInitialized = false;
let globalHandlersBound = false;

// Ensure DOM elements are ready before trying to use them
document.addEventListener('DOMContentLoaded', () => {
    // Attempt to inject Maps script immediately
    injectMapsScript();
    
    // Bind global handlers like popstate and service worker
    bindGlobalHandlers(); 
});


function initApp() { 
      console.log("initApp called");
      if (appInitialized) {
          console.log("App already initialized.");
          return;
      }
      appInitialized = true;
      console.log("Initializing app...");

      // Ensure Google Maps objects are available
      if (typeof google === 'undefined' || !google.maps || !google.maps.Map) {
           console.error("Google Maps API not loaded before initApp!");
           alert("Error loading map services. Please refresh the page.");
           return;
      }

      try {
          map = new google.maps.Map($("hiddenMap"), { center: { lat: 0, lng: 0 }, zoom: 15 });
          placesService = new google.maps.places.PlacesService(map);
          geocoder = new google.maps.Geocoder();
          console.log("Maps services initialized.");

          // Request Geolocation
          if (navigator.geolocation) {
              console.log("Requesting geolocation...");
navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError, {
                  enableHighAccuracy: false, // Use faster Wi-Fi/cell tower location
                  timeout: 15000, // Increase timeout to 15 seconds
                  maximumAge: 60000 // Allow a cached location from the last minute
              });
          } else {
              console.warn("Geolocation not supported.");
              showManualInput(); 
              setWeatherPlaceholder('Geolocation not available. Enter location.');
          }

          // Initialize UI components
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
          
          console.log("App initialization complete.");

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

// Google Maps callback function
window.initMap = initApp; 

// Function to inject the Google Maps script
function injectMapsScript() {
      // Prevent multiple injections
      if (document.querySelector('script[data-role="maps-api"]')) {
          console.log("Maps script already present.");
          // If script exists but initMap wasn't called (e.g., race condition), call it now if API is loaded
          if (typeof google !== 'undefined' && google.maps && !appInitialized) {
               console.log("Maps API loaded, calling initMap manually.");
               initMap();
          }
          return;
      }
      
      console.log("Injecting Google Maps script...");
      // Use environment variable or fallback key
      const fallbackKey = 'YOUR_FALLBACK_API_KEY'; // Replace with your actual fallback key if needed
      const mapsKey = window.MAPS_API_KEY || fallbackKey;
      
      if (mapsKey === 'YOUR_FALLBACK_API_KEY' || !mapsKey) {
           console.warn("Maps API Key is missing or using fallback!");
           // Optionally: Display a message to the user or disable map features
           // alert("Map features require an API key and may not function correctly.");
      }

      const mapsScript = document.createElement('script');
      mapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places,geometry&callback=initMap`;
      mapsScript.async = true;
      mapsScript.defer = true;
      mapsScript.dataset.role = 'maps-api';
      mapsScript.onerror = () => {
           console.error("Failed to load Google Maps script!");
           alert("Error loading map services. Please check your internet connection and refresh the page.");
           // Optionally: Disable map-dependent features or show an error message in the UI
           document.getElementById('locationDisplay').textContent = "Map services failed to load.";
      };
      document.head.appendChild(mapsScript);
}
