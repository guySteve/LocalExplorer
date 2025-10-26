// --- NEW COMPASS LOGIC V3.1 ---

let compassWatchId = null;
let orientationListener = null;
let orientationEventType = null; 
let dialAnimationFrameId = null; 
let arrowAnimationFrameId = null; 
let currentHeading = 0; // The direction the device is pointing (0-360), North is 0

// Dial (NESW ring) rotation
let dialVisualRotation = 0; 
let dialTargetRotation = 0; 

// Heading Arrow rotation
let arrowVisualRotation = 0; 
let arrowTargetRotation = 0;

// --- Navigation Related ---
let navigationStopped = true; 
let currentRouteSteps = [];
let currentNavigationIndex = 0;
let currentSpeechUtterance = null;
let currentTravelMode = 'DRIVING';
let radarDestLatLng = null; // Store destination LatLng if provided
let currentPosition = null; // Store current position for bearing calculations


// --- Utility Functions ---
function normalizeHeading(heading) {
    if (heading === null || typeof heading === 'undefined' || isNaN(heading)) return 0; 
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

function getIconForInstruction(instruction) { /* ... unchanged ... */ }

// --- Core Compass Function ---
function openCompass(destLatLng = null, destName = '') {
    console.log("Opening compass...");
    const overlay = $("compassOverlay"); 
    const dial = $("compassDial"); // The rotating NESW ring
    const headingArrow = $("compassHeadingArrow"); // The arrow pointing device direction
    const headingReadout = $("compassHeadingValue");
    const destinationReadout = $("compassDestinationLabel");
    const directionsCard = $("compassDirectionsCard");

    if (!overlay || !dial || !headingArrow) {
        console.error("Compass UI elements not found!");
        return;
    }

    // --- Reset State ---
    console.log("Resetting compass state...");
    if (orientationListener && orientationEventType) {
        window.removeEventListener(orientationEventType, orientationListener, true);
        orientationListener = null;
        orientationEventType = null;
        console.log("Removed previous orientation listener.");
    }
    if (compassWatchId) {
        navigator.geolocation.clearWatch(compassWatchId);
        compassWatchId = null;
        console.log("Cleared previous geolocation watch.");
    }
    if (dialAnimationFrameId) cancelAnimationFrame(dialAnimationFrameId);
    if (arrowAnimationFrameId) cancelAnimationFrame(arrowAnimationFrameId);
    dialAnimationFrameId = null;
    arrowAnimationFrameId = null;
    
    dialVisualRotation = 0;
    dialTargetRotation = 0;
    arrowVisualRotation = 0;
    arrowTargetRotation = 0;
    currentHeading = 0;
    
    // Reset rotations immediately
    dial.style.transform = `rotate(0deg)`; 
    headingArrow.style.transform = `translate(-50%, -85%) rotate(0deg)`; // Ensure Y offset is correct
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
            destinationReadout.textContent = destName || 'Calculating...';
            destinationReadout.previousElementSibling.style.display = 'block'; // Show Dest Label
            directionsCard.style.display = 'block';
            $("readDirectionsBtn").disabled = true;
            $("silenceBtn").disabled = true;
            resetStepUi('Waiting for location...');
            console.log("Compass opened in navigation mode for:", destName);
        } else {
            destinationReadout.textContent = 'Invalid Destination';
            destinationReadout.previousElementSibling.style.display = 'block'; // Show Dest Label
            directionsCard.style.display = 'none';
            console.warn("Invalid destination passed to openCompass.");
        }
    } else {
        destinationReadout.textContent = ''; // No destination text
        destinationReadout.previousElementSibling.style.display = 'none'; // Hide Dest Label
        directionsCard.style.display = 'none';
        console.log("Compass opened in simple mode.");
    }

    overlay.classList.add('active'); 
    document.body.classList.add('modal-open');

    // --- Animation Logic ---
    const lerpAngle = (start, end, factor) => {
        const diff = ((end - start + 540) % 360) - 180;
        return (start + diff * factor + 360) % 360;
    };
    
    const animateDial = () => {
        if (!dial) { dialAnimationFrameId = null; return; }
        const currentRotation = dialVisualRotation;
        const targetRotation = dialTargetRotation;
        
        if (Math.abs(((targetRotation - currentRotation + 540) % 360) - 180) < 0.1) {
            dialVisualRotation = targetRotation;
            dialAnimationFrameId = null; 
        } else {
            dialVisualRotation = lerpAngle(currentRotation, targetRotation, 0.15); // Smoothing factor
            dialAnimationFrameId = requestAnimationFrame(animateDial); 
        }
        dial.style.transform = `rotate(${dialVisualRotation}deg)`;
    };
     const animateArrow = () => {
        if (!headingArrow) { arrowAnimationFrameId = null; return; }
        const currentRotation = arrowVisualRotation;
        const targetRotation = arrowTargetRotation;
        
         if (Math.abs(((targetRotation - currentRotation + 540) % 360) - 180) < 0.1) {
            arrowVisualRotation = targetRotation;
            arrowAnimationFrameId = null;
        } else {
            arrowVisualRotation = lerpAngle(currentRotation, targetRotation, 0.15); // Smoothing factor
            arrowAnimationFrameId = requestAnimationFrame(animateArrow);
        }
        headingArrow.style.transform = `translate(-50%, -85%) rotate(${arrowVisualRotation}deg)`;
    };

    const requestDialAnimation = () => {
        if (!dialAnimationFrameId && dial) { 
             dialAnimationFrameId = requestAnimationFrame(animateDial);
        }
    };
    const requestArrowAnimation = () => {
         if (!arrowAnimationFrameId && headingArrow) {
            arrowAnimationFrameId = requestAnimationFrame(animateArrow);
        }
    };

    // --- Sensor Update Handler ---
    const handleOrientation = (event) => {
        let heading = null;
        // console.log("Orientation Event:", event); // DEBUG: Log the raw event

        // iOS Specific: webkitCompassHeading is absolute North
        if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
            heading = event.webkitCompassHeading;
             console.log(`Using webkitCompassHeading: ${heading}`);
        } 
        // Standard spec: alpha is rotation around Z axis
        // Need to check 'absolute' for true North vs device relative
        else if (event.absolute === true && event.alpha !== null) {
             // alpha = 0 is North, increases clockwise.
             // We want heading where 0 is North. So heading = alpha.
             heading = event.alpha;
             console.log(`Using absolute alpha: ${heading}`);
        } 
        // Fallback for non-absolute alpha (less reliable - relative to initial position)
        // This might require calibration or user interaction in a real app.
        // For now, treat it like absolute alpha for demonstration.
        else if (event.alpha !== null) {
             heading = event.alpha;
             console.log(`Using relative alpha (less reliable): ${heading}`);
        }
        
        if (heading === null || isNaN(heading)) {
             // console.warn("Could not determine heading from event.");
             return; 
        }

        currentHeading = normalizeHeading(heading); 
        
        // --- ROTATION LOGIC ---
        // 1. Dial (NESW Ring): Rotate opposite to heading so N points North relative to the device's top.
        dialTargetRotation = normalizeHeading(0 - currentHeading); 
        
        // 2. Arrow: Points straight up relative to the device (always 0 degrees relative TO THE DIAL CONTAINER).
        // It visually indicates the device's heading because the dial rotates underneath it.
        // We set the arrow's rotation relative to the *device*, which is always 0.
        arrowTargetRotation = 0; // The arrow *itself* doesn't rotate with heading, the dial does.
        // --- END ROTATION LOGIC ---

        headingReadout.textContent = `${String(Math.round(currentHeading)).padStart(3, '0')}°`;
            
        requestDialAnimation(); 
        // We only animate the *dial* based on orientation. The arrow stays fixed relative to the container.
        // Requesting arrow animation here would overwrite its fixed state if logic changes later.
        // Ensure the arrow's base state is correct:
        if (!arrowAnimationFrameId) { // Only reset if not animating (shouldn't be)
           headingArrow.style.transform = `translate(-50%, -85%) rotate(0deg)`;
        }
    };

    // --- Request Permissions and Start Listener ---
    const startOrientationListener = () => {
        // Clear previous listener if any
        if (orientationListener && orientationEventType) {
            window.removeEventListener(orientationEventType, orientationListener, true);
            orientationListener = null;
            orientationEventType = null;
        }
        
        const register = (eventName) => {
            console.log(`Registering compass listener: ${eventName}`);
            orientationEventType = eventName;
            orientationListener = handleOrientation;
            // Use capture phase for potentially better performance
            window.addEventListener(eventName, orientationListener, { capture: true }); 
        };

        // Check for iOS 13+ permission API
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log("Requesting DeviceOrientation permission (iOS)...");
            DeviceOrientationEvent.requestPermission().then(permissionState => {
                console.log(`Permission state: ${permissionState}`);
                if (permissionState === 'granted') {
                    // Prefer absolute if available
                    if ('ondeviceorientationabsolute' in window) {
                         register('deviceorientationabsolute');
                    } else {
                         register('deviceorientation');
                    }
                } else {
                    console.warn('DeviceOrientation permission denied.');
                    alert('Compass permission was denied. Please allow sensor access in your browser or device settings.');
                    headingReadout.textContent = 'DENIED';
                }
            }).catch(error => {
                console.error('Error requesting DeviceOrientation permission:', error);
                alert("Could not request sensor permission. Compass may not work.");
                headingReadout.textContent = 'ERROR';
            });
        } 
        // Check for standard absolute orientation (Android/Chrome)
        else if ('ondeviceorientationabsolute' in window) {
             console.log("Using 'deviceorientationabsolute'.");
             register('deviceorientationabsolute');
        } 
        // Fallback to standard relative orientation
        else if ('ondeviceorientation' in window) {
             console.log("Using standard 'deviceorientation' (may be relative).");
             register('deviceorientation');
        } 
        // No support
        else {
            console.error('DeviceOrientation events not supported.');
            alert("Sorry, your device or browser doesn't support the compass features.");
            headingReadout.textContent = 'N/A';
        }
    };

    startOrientationListener(); // Attempt to start listening

    // --- Geolocation Watch (for directions & destination bearing) ---
     let routeFetched = false; 
     if (navigator.geolocation) {
        console.log("Starting geolocation watch...");
        compassWatchId = navigator.geolocation.watchPosition(
            (position) => {
                // console.log("Geolocation update:", position); // DEBUG: Log position
                currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };

                // Fetch route if we have a destination and haven't fetched yet
                if (radarDestLatLng && !routeFetched) {
                    console.log("Fetching route...");
                    fetchAndDisplayRoute(currentTravelMode);
                    routeFetched = true;
                }
                 // Update destination bearing if needed
                if (radarDestLatLng) {
                    try {
                        const curLatLng = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);
                        const bearing = google.maps.geometry.spherical.computeHeading(curLatLng, radarDestLatLng);
                        destinationReadout.textContent = `${destName} (${String(Math.round(bearing)).padStart(3, '0')}°)`;
                    } catch (e) {
                        console.error("Error calculating bearing:", e); // Catch Maps geometry errors
                    }
                }
            },
            (error) => {
                console.error("Geolocation watch error:", error);
                alert(`Location error: ${error.message}`);
                if (radarDestLatLng && !routeFetched) {
                    resetStepUi(`Location error`);
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // More aggressive options
        );
    } else if (radarDestLatLng) {
         console.warn("Geolocation not supported.");
         resetStepUi('Geolocation is not supported.');
    }


    // --- Close Button ---
    const closeBtn = $("closeCompassBtn");
    if (closeBtn) {
        closeBtn.onclick = null; // Remove previous listener first
        closeBtn.onclick = () => {
            console.log("Closing compass...");
            closeOverlayElement(overlay);
            // Clean up listeners and timers
            if (orientationListener && orientationEventType) {
                window.removeEventListener(orientationEventType, orientationListener, { capture: true });
                orientationListener = null;
                orientationEventType = null;
                console.log("Orientation listener removed.");
            }
            if (compassWatchId) {
                navigator.geolocation.clearWatch(compassWatchId);
                compassWatchId = null;
                console.log("Geolocation watch cleared.");
            }
            if (dialAnimationFrameId) cancelAnimationFrame(dialAnimationFrameId);
            if (arrowAnimationFrameId) cancelAnimationFrame(arrowAnimationFrameId);
             dialAnimationFrameId = null;
             arrowAnimationFrameId = null;
             console.log("Animation frames cancelled.");

            if (radarDestLatLng) silenceDirections(); 
        };
    }

    // --- Navigation UI Logic (Only if destination exists) ---
     if (radarDestLatLng) {
         setupNavigationUI(); // Encapsulate navigation setup
     }
} // End of openCompass


// --- Navigation Setup Function (Refactored from openCompass) ---
function setupNavigationUI() {
    const dl = $("directionsList");
    const nextStepTextEl = $("nextStepText");
    const nextStepBtn = $("nextStepBtn");
    const showAllBtn = $("showAllStepsBtn");
    const rb = $("readDirectionsBtn");
    const sb = $("silenceBtn");
    
    // Ensure elements exist before adding listeners
    if (!dl || !nextStepTextEl || !nextStepBtn || !showAllBtn || !rb || !sb) {
        console.error("Navigation UI elements missing!");
        return;
    }

    currentTravelMode=document.querySelector('input[name="travelMode"]:checked')?.value||'DRIVING';
    const ds=new google.maps.DirectionsService();
    let nextStepPointer = 0;
    let stepsExpanded = false;

    const collapseStepList = () => { if (dl) dl.classList.add('collapsed'); stepsExpanded = false; if (showAllBtn) showAllBtn.textContent = 'Show All'; };
    const expandStepList = () => { if (dl) dl.classList.remove('collapsed'); stepsExpanded = true; if (showAllBtn) showAllBtn.textContent = 'Hide All'; };
    const updateStepPreview = () => {
        if (!currentRouteSteps.length) {
            nextStepTextEl.textContent = 'Waiting for route...';
            nextStepBtn.disabled = true;
            nextStepBtn.textContent = 'Next';
            return;
        }
        if (nextStepPointer >= currentRouteSteps.length) {
            nextStepTextEl.textContent = 'You have arrived!';
            nextStepBtn.disabled = true;
            nextStepBtn.textContent = 'Arrived';
            return;
        }
        const upcoming = stripHtml(currentRouteSteps[nextStepPointer].instructions) || 'Continue';
        nextStepTextEl.textContent = upcoming;
        nextStepBtn.disabled = false;
        nextStepBtn.textContent = nextStepPointer === 0 ? 'Start' : 'Next';
    };
    const setNextStepPointer = (value) => {
        nextStepPointer = Math.min(value, currentRouteSteps.length); 
        updateStepPreview();
    };
    const revealStep = (idx) => { const node = dl.children[idx]; if (node) node.classList.remove('future-step'); };
    const resetStepUi = (message = 'Waiting for route...') => {
        dl.innerHTML = '';
        nextStepTextEl.textContent = message;
        nextStepBtn.disabled = true; nextStepBtn.textContent = 'Next'; 
        setNextStepPointer(0);
        collapseStepList();
    };

    nextStepBtn.onclick = () => {
        if (!currentRouteSteps || !currentRouteSteps.length) return;
        const idx = Math.min(nextStepPointer, currentRouteSteps.length -1); 
        highlightStep(idx);
        revealStep(idx);
        setNextStepPointer(idx + 1);
        // Optionally: Speak the step when manually advancing
        // if (!navigationStopped && idx < currentRouteSteps.length) {
        //     currentNavigationIndex = idx; // Sync speech index
        //     speakNextStep(); 
        // }
    };
    showAllBtn.onclick = () => {
        if (stepsExpanded) collapseStepList();
        else {
            expandStepList();
            Array.from(dl.children).forEach(el => el.classList.remove('future-step'));
        }
    };

    function fetchAndDisplayRoute(mode){
        if (!currentPosition) {
            dl.textContent = 'Waiting for location…';
            rb.disabled = true;
            return;
        }
        resetStepUi('Plotting route...');
        dl.innerHTML='Calculating...';
        rb.disabled=true;
        sb.disabled = true;

        ds.route({origin:currentPosition,destination:radarDestLatLng,travelMode:google.maps.TravelMode[mode]},(r,s)=>{
            if (!dl) return; 
            dl.innerHTML='';
            if(s===google.maps.DirectionsStatus.OK && r?.routes?.[0]?.legs?.[0]?.steps){
                currentRouteSteps=r.routes[0].legs[0].steps;
                currentNavigationIndex=0;
                currentRouteSteps.forEach((st,i)=>{
                    const d=document.createElement('div');
                    d.dataset.index=i;
                    const ic=getIconForInstruction(st.instructions);
                    const cleanInstructions = stripHtml(st.instructions); 
                    d.innerHTML=`<span class="direction-icon">${ic}</span> ${cleanInstructions}`;
                    d.classList.add('future-step'); 
                    dl.appendChild(d);
                });
                rb.disabled=false;
                nextStepBtn.disabled=false; nextStepBtn.textContent='Start'; 
                setNextStepPointer(0); 
             } else {
                console.error(`Directions request failed: ${s}`, r);
                dl.textContent=`Route error: ${s}`;
                currentRouteSteps=[];
                setNextStepPointer(0);
                rb.disabled = true;
            }
        }); 
    }
    
    function readDirections(){if(!currentRouteSteps||currentRouteSteps.length===0)return;navigationStopped=false;rb.disabled=true;rb.textContent="Reading...";sb.disabled=false;setNextStepPointer(currentNavigationIndex);speakNextStep();}
    function silenceDirections(){console.log("Silencing directions."); navigationStopped=true;speechSynthesis.cancel();if(currentSpeechUtterance)currentSpeechUtterance.onend=null;rb.disabled=(!currentRouteSteps || currentRouteSteps.length===0);rb.textContent="🗣️ Read Steps";sb.disabled=true;}
    function highlightStep(idx){if(!dl)return;Array.from(dl.children).forEach((el,i)=>{const isMatch=i===idx;el.classList.toggle('current-step',isMatch);if(isMatch){el.classList.remove('future-step');el.scrollIntoView({behavior:'smooth',block:'nearest'});}});}
    function speakNextStep(){
        if(navigationStopped || currentNavigationIndex >= currentRouteSteps.length){
            silenceDirections();
            if (currentNavigationIndex >= currentRouteSteps.length) {
                 nextStepTextEl.textContent = "You have arrived!";
                 nextStepBtn.textContent = 'Arrived';
                 nextStepBtn.disabled = true;
            }
            return;
        }
        highlightStep(currentNavigationIndex);
        setNextStepPointer(currentNavigationIndex + 1); 
        
        const step=currentRouteSteps[currentNavigationIndex];
        const clean=stripHtml(step.instructions);
        const txt = clean; 
        
        if (txt) { 
            console.log(`Speaking step ${currentNavigationIndex + 1}: ${txt}`);
            currentSpeechUtterance=new SpeechSynthesisUtterance(txt);
            const voices=speechSynthesis.getVoices();
            const pref=selectedVoiceUri||voiceSelect?.value||'';
            const voice=voices.find(v=>v.voiceURI===pref)||voices[0]; 
            if(voice)currentSpeechUtterance.voice=voice;
            currentSpeechUtterance.pitch=1;
            currentSpeechUtterance.rate=1.1; 
            currentSpeechUtterance.volume=1;
            
            currentSpeechUtterance.onend=()=>{
                console.log(`Finished speaking step ${currentNavigationIndex + 1}`);
                if(!navigationStopped){
                    currentNavigationIndex++;
                    setTimeout(speakNextStep, 750); 
                }
                // Only reset button text if silencing didn't happen during speech
                if (!navigationStopped && rb && rb.textContent==="Reading...") { 
                    rb.textContent="🗣️ Read Steps"; 
                    rb.disabled = true; // Keep disabled until next step starts or stops
                }
            };
            currentSpeechUtterance.onerror=(e)=>{
                console.error('Speech synthesis error:',e);
                alert(`Speech error: ${e.error}`);
                silenceDirections(); 
            };
            // Workaround for potential speech synthesis issues
            setTimeout(() => {
                try {
                    speechSynthesis.speak(currentSpeechUtterance);
                    rb.disabled = true; // Keep disabled while potentially speaking
                } catch (e) {
                     console.error("Error calling speechSynthesis.speak:", e);
                     silenceDirections();
                }
            }, 50); // Small delay before speaking

        } else {
             console.log(`Skipping step ${currentNavigationIndex + 1} (no text)`);
             // Move immediately to the next
             if(!navigationStopped){
                    currentNavigationIndex++;
                    setTimeout(speakNextStep, 50); 
             }
        }
    }
    
    rb.onclick=readDirections;
    sb.onclick=silenceDirections;
    
    // Initial fetch if position is already known
     if (currentPosition) {
         fetchAndDisplayRoute(currentTravelMode);
     }
} // End of setupNavigationUI
