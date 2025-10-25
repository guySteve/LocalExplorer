let appInitialized = false;
let globalHandlersBound = false;

function initApp() { /* Main app initialization after Maps loads */
      if (appInitialized) return;
      appInitialized = true;
      map = new google.maps.Map($("hiddenMap"), { center: { lat: 0, lng: 0 }, zoom: 15 });
      placesService = new google.maps.places.PlacesService(map);
      geocoder = new google.maps.Geocoder();
      if (navigator.geolocation) navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError);
      else showManualInput(); // Fallback if no geolocation
      populateFilterButtons(); // Create category buttons
      initWeatherControls(); // Setup weather refresh/toggle
      initSettingsPanel(); // Setup settings modal
      setupAccordions(); // Enable accordions in details
      initUiEvents(); // Bind modal/button handlers
      initDetailsSheetInteractions(); // Swipe + close controls
      populateVoices();
      if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
      }
      checkSharedPlan(); // Check URL for shared plan
      bindGlobalHandlers();
    }

function bindGlobalHandlers() {
      if (globalHandlersBound) return;
      globalHandlersBound = true;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker-v2.js').catch((err) => console.warn('SW registration failed', err));
      }
      window.addEventListener('popstate', () => {
        document.querySelectorAll('.modal.active').forEach((modal) => modal.classList.remove('active'));
        if ($("detailsSheet")?.classList.contains('active')) closeDetails();
        const compassBtn = $("closeCompassBtn");
        if ($("compassOverlay")?.classList.contains('active') && compassBtn) compassBtn.click();
        document.body.classList.remove('modal-open');
      });
    }

window.initMap = initApp; // Google Maps callback

(function injectMapsScript() {
      const fallbackKey = 'AIzaSyB9PMHJVDip9WvIQVywmRjcdhqiQPrtXiY';
      const mapsKey = window.MAPS_API_KEY || fallbackKey;
      if (document.querySelector('script[data-role="maps-api"]')) return;
      const mapsScript = document.createElement('script');
      mapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places,geometry&callback=initMap`;
      mapsScript.async = true;
      mapsScript.defer = true;
      mapsScript.dataset.role = 'maps-api';
      document.head.appendChild(mapsScript);
    })();
