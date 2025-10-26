// --- NEW COMPASS LOGIC (Simplified & Corrected) ---

let compassWatchId = null;
let orientationListener = null;
let orientationEventType = null; // To store the type of event listener used
let dialAnimationFrameId = null;
let currentHeading = 0; // The direction the device is facing (0-360)
let dialVisualRotation = 0; // Current visual rotation of the dial
let dialTargetRotation = 0; // Target rotation for smooth animation

// --- Navigation Related (Only used if destination is provided) ---
let navigationStopped = true; // Start stopped
let currentRouteSteps = [];
let currentNavigationIndex = 0;
let currentSpeechUtterance = null;
let currentTravelMode = 'DRIVING';
let radarDestLatLng = null; // Store destination LatLng if provided


// --- Utility Functions ---
function normalizeHeading(heading) {
    if (heading === null || typeof heading === 'undefined') return null;
    let h = heading % 360;
    return h < 0 ? h + 360 : h;
}

function stripHtml(text) { return (text || '').replace(/<[^>]+>/g, '').trim(); }

function toPlainLatLng(latLng) {
      if (!latLng) return null;
      if (typeof latLng.lat === 'function' && typeof latLng.lng === 'function') {
        return { lat: latLng.lat(), lng: latLng.lng() };
      }
      if (typeof latLng.lat === 'number' && typeof latLng.lng === 'number') return latLng;
      return null;
}

function getIconForInstruction(instruction) {
      const lowerInstruction = instruction.toLowerCase();
      if (lowerInstruction.includes('turn left')) return '↖️';
      if (lowerInstruction.includes('turn right')) return '↗️';
      if (lowerInstruction.includes('keep left')) return '↰';
      if (lowerInstruction.includes('keep right')) return '↱';
      if (lowerInstruction.includes('straight')) return '⬆️';
      if (lowerInstruction.includes('merge')) return '⤸';
      if (lowerInstruction.includes('roundabout') || lowerInstruction.includes('traffic circle')) return '🔄';
      if (lowerInstruction.includes('exit')) return '↘️';
      if (lowerInstruction.includes('destination')) return '🏁';
      return '➡️'; // Default
}

// --- Core Compass Function ---
function openCompass(destLatLng = null, destName = '') {
    const overlay = $("compassOverlay"); 
    const dial = $("compassArrowContainer");
    const headingReadout = $("compassHeadingValue");
    const destinationReadout = $("compassDestinationLabel");
    const directionsCard = $("compassDirectionsCard");

    if (!overlay || !dial) {
        console.error("Compass UI elements not found!");
        return;
    }

    // --- Reset State ---
    if (orientationListener && orientationEventType) {
        window.removeEventListener(orientationEventType, orientationListener, true);
        orientationListener = null;
        orientationEventType = null;
    }
    if (compassWatchId) {
        navigator.geolocation.clearWatch(compassWatchId);
        compassWatchId = null;
    }
    if (dialAnimationFrameId) {
        cancelAnimationFrame(dialAnimationFrameId);
        dialAnimationFrameId = null;
    }
    dialVisualRotation = 0;
    dialTargetRotation = 0;
    currentHeading = 0;
    dial.style.transform = `rotate(0deg)`; // Reset rotation immediately
    headingReadout.textContent = '---°';
    populateVoices(); 
    navigationStopped = true; 
    speechSynthesis.cancel(); 
    currentRouteSteps = []; 
    currentNavigationIndex = 0;
    radarDestLatLng = null; // Clear previous destination

    // --- Setup Based on Destination ---
    if (destLatLng) {
        const destPlain = toPlainLatLng(destLatLng);
        if (destPlain) {
            radarDestLatLng = new google.maps.LatLng(destPlain.lat, destPlain.lng);
            destinationReadout.textContent = destName || 'Loading...';
            directionsCard.style.display = 'block';
             // Reset and disable direction buttons
            $("readDirectionsBtn").disabled = true;
            $("silenceBtn").disabled = true;
            resetStepUi('Waiting for location...');
        } else {
            // Invalid destination passed
            destinationReadout.textContent = 'Invalid Destination';
            directionsCard.style.display = 'none';
        }
    } else {
        // No destination - Simple Compass Mode
        destinationReadout.textContent = 'Pointing North';
        directionsCard.style.display = 'none';
    }

    overlay.classList.add('active'); 
    document.body.classList.add('modal-open');

    // --- Animation Logic ---
    const animateDial = () => {
        if (!dial) { dialAnimationFrameId = null; return; }
        // Smooth rotation using interpolation
        const diff = ((dialTargetRotation - dialVisualRotation + 540) % 360) - 180;
        if (Math.abs(diff) < 0.1) { // Stop when close enough
            dialVisualRotation = dialTargetRotation;
            dialAnimationFrameId = null; // Stop animation loop
        } else {
            dialVisualRotation = (dialVisualRotation + diff * 0.15 + 360) % 360; // Adjust multiplier for smoothness (0.15 is a good start)
            dialAnimationFrameId = requestAnimationFrame(animateDial); // Continue loop
        }
        dial.style.transform = `rotate(${dialVisualRotation}deg)`;
    };

    const requestDialAnimation = () => {
        if (!dialAnimationFrameId && dial) { // Start loop only if not already running
             dialAnimationFrameId = requestAnimationFrame(animateDial);
        }
    };

    // --- Sensor Update Handler ---
    const handleOrientation = (event) => {
        let heading = null;

        // Try different properties based on browser/device
        if (event.webkitCompassHeading) {
            // iOS
            heading = normalizeHeading(event.webkitCompassHeading);
        } else if (event.absolute === true && event.alpha !== null) {
             // Android/Chrome with absolute orientation
             // The alpha value is 0-360 degrees, where 0 is North.
             // We want the rotation to be the NEGATIVE of this to make North point up.
             heading = normalizeHeading(360 - event.alpha); 
        } else if (event.alpha !== null) {
            // Standard non-absolute (less reliable, might drift)
            // Still use 360 - alpha
            heading = normalizeHeading(360 - event.alpha);
        }
        
        if (heading !== null) {
            currentHeading = heading; // Store the raw heading
            // Calculate the dial rotation needed to make North point up
            dialTargetRotation = normalizeHeading(0 - currentHeading); 
            
            // Update the readout showing the device's heading
            headingReadout.textContent = `${String(Math.round(currentHeading)).padStart(3, '0')}°`;
            
            requestDialAnimation(); // Start/continue the smooth rotation
        }
    };

    // --- Request Permissions and Start Listener ---
    const startOrientationListener = () => {
        if (orientationListener) return; // Already listening

        const register = (eventName) => {
            console.log(`Registering compass listener: ${eventName}`);
            orientationEventType = eventName;
            orientationListener = handleOrientation;
            window.addEventListener(eventName, orientationListener, true);
        };

        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires explicit permission
            DeviceOrientationEvent.requestPermission().then(permissionState => {
                if (permissionState === 'granted') {
                     // Prefer 'absolute' if available (more stable)
                    if ('ondeviceorientationabsolute' in window) {
                         register('deviceorientationabsolute');
                    } else {
                         register('deviceorientation');
                    }
                } else {
                    console.warn('DeviceOrientation permission denied.');
                    alert('Compass permission was denied. Please grant it in your browser settings.');
                }
            }).catch(error => {
                console.error('Error requesting DeviceOrientation permission:', error);
                 // Fallback for browsers that might error but still support the event
                if ('ondeviceorientationabsolute' in window) { register('deviceorientationabsolute'); }
                else if ('ondeviceorientation' in window) { register('deviceorientation'); }
                 else { alert("Compass features are not supported on this device."); }
            });
        } else {
            // Non-iOS 13+ or browsers without the permission API
            if ('ondeviceorientationabsolute' in window) {
                 register('deviceorientationabsolute');
            } else if ('ondeviceorientation' in window) {
                 register('deviceorientation');
            } else {
                console.warn('DeviceOrientation events not supported.');
                alert("Compass features are not supported on this device.");
            }
        }
    };

    startOrientationListener(); // Attempt to start listening

    // --- Geolocation Watch (primarily for directions, can provide heading fallback) ---
     let routeFetched = false; 
     if (navigator.geolocation) {
        compassWatchId = navigator.geolocation.watchPosition(
            (position) => {
                currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };

                // Use geolocation heading ONLY if device orientation fails
                if (orientationListener === null && typeof position.coords.heading === 'number' && !isNaN(position.coords.heading)) {
                     const geoHeading = normalizeHeading(position.coords.heading);
                     if (geoHeading !== null) {
                         currentHeading = geoHeading;
                         dialTargetRotation = normalizeHeading(0 - currentHeading);
                         headingReadout.textContent = `${String(Math.round(currentHeading)).padStart(3, '0')}°`;
                         requestDialAnimation();
                     }
                }
                
                // Fetch route if we have a destination and haven't fetched yet
                if (radarDestLatLng && !routeFetched) {
                    fetchAndDisplayRoute(currentTravelMode);
                    routeFetched = true;
                }
                 // Update destination bearing if needed
                if (radarDestLatLng) {
                    const curLatLng = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);
                    const bearing = google.maps.geometry.spherical.computeHeading(curLatLng, radarDestLatLng);
                    destinationReadout.textContent = `${destName} (${String(Math.round(bearing)).padStart(3, '0')}°)`;
                }
            },
            (error) => {
                console.error("Geolocation watch error:", error);
                if (radarDestLatLng && !routeFetched) {
                    resetStepUi(`Location error: ${error.message}`);
                }
            },
            { enableHighAccuracy: true }
        );
    } else if (radarDestLatLng) {
         resetStepUi('Geolocation is not supported.');
    }


    // --- Close Button ---
    const closeBtn = $("closeCompassBtn");
    if (closeBtn) {
        closeBtn.onclick = () => {
            closeOverlayElement(overlay);
            // Clean up listeners and timers
            if (orientationListener && orientationEventType) {
                window.removeEventListener(orientationEventType, orientationListener, true);
                orientationListener = null;
                orientationEventType = null;
            }
            if (compassWatchId) {
                navigator.geolocation.clearWatch(compassWatchId);
                compassWatchId = null;
            }
            if (dialAnimationFrameId) {
                cancelAnimationFrame(dialAnimationFrameId);
                dialAnimationFrameId = null;
            }
            if (radarDestLatLng) silenceDirections(); // Stop speech if navigating
        };
    }

    // --- Navigation UI Logic (Only if destination exists) ---
     if (radarDestLatLng) {
          
        const ds=new google.maps.DirectionsService();
        const nextStepBtn = $("nextStepBtn");
        const showAllBtn = $("showAllStepsBtn");
        let nextStepPointer = 0;
        let stepsExpanded = false;

        const collapseStepList = () => { if (dl) dl.classList.add('collapsed'); stepsExpanded = false; if (showAllBtn) showAllBtn.textContent = 'Show full route'; };
        const expandStepList = () => { if (dl) dl.classList.remove('collapsed'); stepsExpanded = true; if (showAllBtn) showAllBtn.textContent = 'Hide steps'; };
        const updateStepPreview = () => {
            if (!nextStepTextEl || !nextStepBtn) return;
            if (!currentRouteSteps.length) {
                nextStepTextEl.textContent = 'Waiting for route...';
                nextStepBtn.disabled = true;
                nextStepBtn.textContent = 'Next step';
                return;
            }
            if (nextStepPointer >= currentRouteSteps.length) {
                nextStepTextEl.textContent = 'You have arrived!';
                nextStepBtn.disabled = true;
                nextStepBtn.textContent = 'Arrived';
                return;
            }
            const upcoming = stripHtml(currentRouteSteps[nextStepPointer].instructions) || 'Continue on course';
            nextStepTextEl.textContent = upcoming;
            nextStepBtn.disabled = false;
            nextStepBtn.textContent = nextStepPointer === 0 ? 'Start route' : 'Next step';
        };
        const setNextStepPointer = (value) => {
            nextStepPointer = Math.min(value, currentRouteSteps.length); // Prevent going beyond last step
            updateStepPreview();
        };
        const revealStep = (idx) => { if (!dl) return; const node = dl.children[idx]; if (node) node.classList.remove('future-step'); };
        const resetStepUi = (message = 'Waiting for route...') => {
            if (dl) dl.innerHTML = '';
            if (nextStepTextEl) nextStepTextEl.textContent = message;
            if (nextStepBtn) { nextStepBtn.disabled = true; nextStepBtn.textContent = 'Next step'; }
            setNextStepPointer(0);
            collapseStepList();
        };

        if (nextStepBtn) nextStepBtn.onclick = () => {
            if (!currentRouteSteps || !currentRouteSteps.length) return;
            const idx = Math.min(nextStepPointer, currentRouteSteps.length -1); // Don't go past end
            highlightStep(idx);
            revealStep(idx);
            setNextStepPointer(idx + 1);
        };
        if (showAllBtn) showAllBtn.onclick = () => {
            if (!dl) return;
            if (stepsExpanded) collapseStepList();
            else {
                expandStepList();
                // Reveal all steps when showing full route
                Array.from(dl.children).forEach(el => el.classList.remove('future-step'));
            }
        };

        function fetchAndDisplayRoute(mode){
            if (!dl || !$("readDirectionsBtn")) return;
            if (!currentPosition) {
                dl.textContent = 'Waiting for your location…';
                $("readDirectionsBtn").disabled = true;
                return;
            }
            resetStepUi('Plotting route...');
            dl.innerHTML='Calculating...';
            $("readDirectionsBtn").disabled=true;
            $("silenceBtn").disabled = true;

            ds.route({origin:currentPosition,destination:radarDestLatLng,travelMode:google.maps.TravelMode[mode]},(r,s)=>{
                if (!dl) return; // Check if element still exists
                dl.innerHTML='';
                if(s===google.maps.DirectionsStatus.OK && r && r.routes && r.routes.length > 0 && r.routes[0].legs && r.routes[0].legs.length > 0){
                    currentRouteSteps=r.routes[0].legs[0].steps;
                    currentNavigationIndex=0;
                    currentRouteSteps.forEach((st,i)=>{
                        const d=document.createElement('div');
                        d.dataset.index=i;
                        const ic=getIconForInstruction(st.instructions);
                        // Sanitize instructions before adding to innerHTML
                        const cleanInstructions = stripHtml(st.instructions); 
                        d.innerHTML=`<span class="direction-icon">${ic}</span> ${cleanInstructions}`;
                        d.classList.add('future-step'); // Initially hide future steps
                        dl.appendChild(d);
                    });
                    $("readDirectionsBtn").disabled=false;
                    if (nextStepBtn) { nextStepBtn.disabled=false; nextStepBtn.textContent='Start route'; }
                    setNextStepPointer(0); // Set preview to the first step
                 } else {
                    dl.textContent=`Route error: ${s}`;
                    currentRouteSteps=[];
                    setNextStepPointer(0);
                    $("readDirectionsBtn").disabled = true;
                }
            }); 
        }
        
        const rb=$("readDirectionsBtn"),sb=$("silenceBtn");
        function readDirections(){if(!currentRouteSteps||currentRouteSteps.length===0)return;navigationStopped=false;rb.disabled=true;rb.textContent="Reading...";sb.disabled=false;setNextStepPointer(currentNavigationIndex);speakNextStep();}
        function silenceDirections(){navigationStopped=true;speechSynthesis.cancel();if(currentSpeechUtterance)currentSpeechUtterance.onend=null;rb.disabled=(!currentRouteSteps || currentRouteSteps.length===0);rb.textContent="🗣️ Read Directions";sb.disabled=true;}
        function highlightStep(idx){if(!dl)return;Array.from(dl.children).forEach((el,i)=>{const isMatch=i===idx;el.classList.toggle('current-step',isMatch);if(isMatch){el.classList.remove('future-step');el.scrollIntoView({behavior:'smooth',block:'nearest'});}});}
        function speakNextStep(){
            if(navigationStopped || currentNavigationIndex >= currentRouteSteps.length){
                silenceDirections();
                 // Optionally update UI for arrival
                if (currentNavigationIndex >= currentRouteSteps.length && nextStepTextEl) {
                     nextStepTextEl.textContent = "You have arrived!";
                     if (nextStepBtn) nextStepBtn.textContent = 'Arrived';
                     if (nextStepBtn) nextStepBtn.disabled = true;
                }
                return;
            }
            highlightStep(currentNavigationIndex);
            setNextStepPointer(currentNavigationIndex + 1); // Update preview for the *next* step
            
            const step=currentRouteSteps[currentNavigationIndex];
            const clean=stripHtml(step.instructions);
            const txt = clean; // Speak only the instruction, not "Step X"
            
            if (txt) { // Only speak if there's text
                currentSpeechUtterance=new SpeechSynthesisUtterance(txt);
                const voices=speechSynthesis.getVoices();
                const pref=selectedVoiceUri||voiceSelect?.value||'';
                const voice=voices.find(v=>v.voiceURI===pref)||voices[0]; // Fallback to first voice
                if(voice)currentSpeechUtterance.voice=voice;
                currentSpeechUtterance.pitch=1;
                currentSpeechUtterance.rate=1.1; // Slightly faster speech rate
                currentSpeechUtterance.volume=1;
                
                currentSpeechUtterance.onend=()=>{
                    if(!navigationStopped){
                        currentNavigationIndex++;
                        // Add a slight delay before speaking the next step
                        setTimeout(speakNextStep, 750); 
                    }
                    // Reset button text only after speech ends
                    if(rb && rb.textContent==="Reading...") {
                        rb.textContent="🗣️ Read Directions"; 
                        // Keep disabled until next step is spoken or stopped
                        if (!navigationStopped) rb.disabled = true; 
                    }
                };
                currentSpeechUtterance.onerror=(e)=>{
                    console.error('Speech synthesis error:',e);
                    silenceDirections(); // Stop on error
                };
                speechSynthesis.speak(currentSpeechUtterance);
                
                // Keep button disabled while speaking
                 if (rb) rb.disabled = true; 
            } else {
                 // If no text for this step, move immediately to the next
                 if(!navigationStopped){
                        currentNavigationIndex++;
                        setTimeout(speakNextStep, 100); // Very short delay
                 }
            }
        }
        rb.onclick=readDirections;
        sb.onclick=silenceDirections;
        // Travel mode change listener removed as it's not in the simplified HTML
    }
}

