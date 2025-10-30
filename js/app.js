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
      if (typeof google === 'undefined' || !google.maps || !google.maps.Map) {
          console.warn("Google Maps API not available yet. Retrying initMapServices shortly.");
          setTimeout(initMapServices, 100);
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
      const mapsKey = window.MAPS_API_KEY || 'AIzaSyB9PMHJVDip9WvIQVywmRjcdhqiQPrtXiY';
      
      if (!mapsKey || mapsKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
           console.warn("Maps API Key is missing or using placeholder!");
           showMapsConfigBanner();
           const locationDisplay = $("locationDisplay");
           if (locationDisplay) {
               locationDisplay.innerHTML = `
                 <div style="text-align: center; padding: 1rem;">
                   <div style="font-size: 2rem; margin-bottom: 0.5rem;">🗺️</div>
                   <div style="font-weight: 600; margin-bottom: 0.5rem;">Maps API Not Configured</div>
                   <div style="font-size: 0.85rem; opacity: 0.8; margin-bottom: 0.5rem;">
                     To enable location services and maps, please configure your Google Maps API key.
                   </div>
                   <button id="showConfigHelpBtn" style="
                     padding: 0.5rem 1rem;
                     background: var(--primary);
                     color: var(--text-light);
                     border: none;
                     border-radius: var(--radius);
                     cursor: pointer;
                     font-size: 0.9rem;
                   ">📖 Setup Guide</button>
                 </div>
               `;
               
               // Bind the help button
               const helpBtn = $("showConfigHelpBtn");
               if (helpBtn) {
                 helpBtn.onclick = () => showMapsConfigModal();
               }
           }
           // Still allow manual input
           return;
      }

      const mapsScript = document.createElement('script');
      mapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places,geometry&callback=initMap&loading=async`;
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
           showMapsConfigBanner('error');
           const locationDisplay = $("locationDisplay");
           if (locationDisplay) {
             locationDisplay.innerHTML = `
               <div style="text-align: center; padding: 1rem;">
                 <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
                 <div style="font-weight: 600; margin-bottom: 0.5rem;">Maps Service Failed</div>
                 <div style="font-size: 0.85rem; opacity: 0.8;">
                   Unable to load Google Maps. Please check your API key and restrictions.
                 </div>
               </div>
             `;
           }
           onLocationError({ message: "Map script failed to load." });
      };
      document.head.appendChild(mapsScript);
}

function showMapsConfigBanner(type = 'warning') {
  // Remove existing banner if present
  const existingBanner = document.querySelector('.maps-config-banner');
  if (existingBanner) {
    existingBanner.remove();
  }
  
  const banner = document.createElement('div');
  banner.className = 'maps-config-banner';
  banner.style.cssText = `
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    background: ${type === 'error' ? '#ff4444' : '#ff9800'};
    color: white;
    padding: 0.75rem 1rem;
    text-align: center;
    z-index: 9999;
    font-size: 0.9rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  banner.innerHTML = `
    <span style="margin-right: 0.5rem;">${type === 'error' ? '⚠️' : '🗺️'}</span>
    <span style="font-weight: 600;">
      ${type === 'error' ? 'Maps API Error' : 'Maps API Not Configured'}
    </span>
    <span style="opacity: 0.9; margin-left: 0.5rem;">
      ${type === 'error' ? 'Check API key and restrictions' : 'Setup required for full functionality'}
    </span>
    <button id="bannerConfigHelp" style="
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.4);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      margin-left: 1rem;
      cursor: pointer;
      font-size: 0.85rem;
    ">Setup Guide</button>
    <button id="closeBanner" style="
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
      margin-left: 1rem;
      padding: 0 0.5rem;
    ">×</button>
  `;
  
  document.body.appendChild(banner);
  
  // Add event listeners
  const closeBtn = document.getElementById('closeBanner');
  if (closeBtn) {
    closeBtn.onclick = () => banner.remove();
  }
  
  const helpBtn = document.getElementById('bannerConfigHelp');
  if (helpBtn) {
    helpBtn.onclick = () => showMapsConfigModal();
  }
}

function showMapsConfigModal() {
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.style.cssText = 'display: flex; z-index: 10000;';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3>🗺️ Google Maps API Setup</h3>
        <button class="close-btn" id="closeMapsConfigModal">×</button>
      </div>
      <div style="padding: 1rem; color: var(--card);">
        <p style="margin-bottom: 1rem;">
          LocalExplorer requires a Google Maps API key to provide location services, 
          place search, and navigation features.
        </p>
        
        <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--primary);">
          📝 Quick Setup Steps:
        </h4>
        <ol style="line-height: 1.8; margin-left: 1.5rem;">
          <li>Get a Google Maps API key at: 
            <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" 
               target="_blank" 
               style="color: var(--accent); text-decoration: underline;">
              Google Cloud Console
            </a>
          </li>
          <li>Enable these APIs:
            <ul style="margin-top: 0.5rem;">
              <li>Maps JavaScript API</li>
              <li>Places API</li>
              <li>Geocoding API</li>
            </ul>
          </li>
          <li>Add API restrictions (recommended):
            <ul style="margin-top: 0.5rem;">
              <li>Application restrictions: HTTP referrers</li>
              <li>Add your domain (e.g., *.netlify.app)</li>
            </ul>
          </li>
          <li>Set the <code style="background: rgba(0,0,0,0.1); padding: 0.2rem 0.4rem; border-radius: 3px;">MAPS_API_KEY</code> 
              environment variable in:
            <ul style="margin-top: 0.5rem;">
              <li><strong>Netlify:</strong> Site Settings → Environment Variables</li>
              <li><strong>Local Dev:</strong> Create a <code>.env</code> file</li>
            </ul>
          </li>
          <li>Redeploy your site (for Netlify) or restart local server</li>
        </ol>
        
        <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--primary);">
          📚 Documentation:
        </h4>
        <ul style="line-height: 1.8; margin-left: 1.5rem;">
          <li><a href="https://github.com/guySteve/LocalExplorer/blob/main/README.md" 
                 target="_blank" 
                 style="color: var(--accent); text-decoration: underline;">
            README.md
          </a> - Full documentation</li>
          <li><a href="https://github.com/guySteve/LocalExplorer/blob/main/NETLIFY_DEPLOY.md" 
                 target="_blank" 
                 style="color: var(--accent); text-decoration: underline;">
            NETLIFY_DEPLOY.md
          </a> - Deployment guide</li>
        </ul>
        
        <div style="
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(200, 121, 65, 0.1);
          border-radius: var(--radius);
          border-left: 4px solid var(--accent);
        ">
          <strong>💡 Tip:</strong> The app will still work for some features without Maps API, 
          but location services, place search, and navigation will be unavailable.
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
  
  // Bind close button
  const closeBtn = document.getElementById('closeMapsConfigModal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.remove();
      document.body.classList.remove('modal-open');
    };
  }
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.classList.remove('modal-open');
    }
  };
}
