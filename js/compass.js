// --- NEW COMPASS LOGIC V3 ---

let compassWatchId = null;
let orientationListener = null;
let orientationEventType = null; 
let dialAnimationFrameId = null; 
let arrowAnimationFrameId = null; // Separate animation frame for arrow
let currentHeading = 0; // The direction the device is pointing (0-360)

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
let radarDestLatLng = null; 


// --- Utility Functions ---
function normalizeHeading(heading) {
    if (heading === null || typeof heading === 'undefined' || isNaN(heading)) return 0; // Default to 0 if invalid
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
    if (orientationListener && orientationEventType) {
        window.removeEventListener(orientationEventType, orientationListener, true);
        orientationListener = null;
        orientationEventType = null;
    }
    if (compassWatchId) {
        navigator.geolocation.clearWatch(compassWatchId);
        compassWatchId = null;
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
    
    dial.style.transform = `rotate(0deg)`; // Reset rotation
    headingArrow.style.transform = `translate(-50%, -100%) rotate(0deg)`; // Reset rotation and position
    headingReadout.textContent = '---°';
    
    populateVoices(); 
    navigationStopped = true; 
    speechSynthesis.cancel(); 
    currentRouteSteps = []; 
    currentNavigationIndex = 0;
    radarDestLatLng = null; 

    // --- Setup Based on Destination ---
    if (destLatLng) {
        const destPlain = toPlainLatLng(destLatLng);
        if (destPlain) {
            radarDestLatLng = new google.maps.LatLng(destPlain.lat, destPlain.lng);
            destinationReadout.textContent = destName || 'Loading...';
            directionsCard.style.display = 'block';
            $("readDirectionsBtn").disabled = true;
            $("silenceBtn").disabled = true;
            resetStepUi('Waiting for location...');
        } else {
            destinationReadout.textContent = 'Invalid Destination';
            directionsCard.style.display = 'none';
        }
    } else {
        destinationReadout.textContent = 'Pointing North';
        directionsCard.style.display = 'none';
    }

    overlay.classList.add('active'); 
    document.body.classList.add('modal-open');

    // --- Animation Logic (Separate for Dial and Arrow) ---
    const animateDial = () => {
        if (!dial) { dialAnimationFrameId = null; return; }
        const diff = ((dialTargetRotation - dialVisualRotation + 540) % 360) - 180;
        if (Math.abs(diff) < 0.1) { 
            dialVisualRotation = dialTargetRotation;
            dialAnimationFrameId = null; 
        } else {
            dialVisualRotation = (dialVisualRotation + diff * 0.15 + 360) % 360; 
            dialAnimationFrameId = requestAnimationFrame(animateDial); 
        }
        dial.style.transform = `rotate(${dialVisualRotation}deg)`;
    };
     const animateArrow = () => {
        if (!headingArrow) { arrowAnimationFrameId = null; return; }
        const diff = ((arrowTargetRotation - arrowVisualRotation + 540) % 360) - 180;
        if (Math.abs(diff) < 0.1) {
            arrowVisualRotation = arrowTargetRotation;
            arrowAnimationFrameId = null;
        } else {
            arrowVisualRotation = (arrowVisualRotation + diff * 0.15 + 360) % 360;
            arrowAnimationFrameId = requestAnimationFrame(animateArrow);
        }
         // Keep the translate part for centering!
        headingArrow.style.transform = `translate(-50%, -100%) rotate(${arrowVisualRotation}deg)`;
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

        if (event.webkitCompassHeading) { // iOS
            heading = event.webkitCompassHeading;
        } else if (event.absolute === true && event.alpha !== null) { // Absolute Orientation API
            heading = event.alpha; // alpha is 0=North, 90=East, etc.
        } else if (event.alpha !== null) { // Standard Orientation API (less reliable)
             heading = event.alpha;
        }
        
        // Ensure heading is valid before proceeding
        if (heading === null || isNaN(heading)) {
             console.warn("Could not determine heading from event:", event);
             return; 
        }

        currentHeading = normalizeHeading(heading); // 0 = North, 90 = East
        
        // --- ROTATION LOGIC ---
        // 1. Dial (NESW Ring): Rotate opposite to heading so N points North.
        dialTargetRotation = normalizeHeading(0 - currentHeading); 
        
        // 2. Arrow: Rotate *with* the heading to show device direction.
        arrowTargetRotation = normalizeHeading(currentHeading); 
        // --- END ROTATION LOGIC ---

        headingReadout.textContent = `${String(Math.round(currentHeading)).padStart(3, '0')}°`;
            
        requestDialAnimation(); 
        requestArrowAnimation(); // Animate both
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
            window.addEventListener(eventName, orientationListener, true);
        };

        // iOS 13+ requires explicit permission
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
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
                else { alert("Compass features require sensor access permission."); }
            });
        } else {
            // Non-iOS 13+ or browsers without the permission API
            if ('ondeviceorientationabsolute' in window) {
                 register('deviceorientationabsolute');
            } else if ('ondeviceorientation' in window) {
                 register('deviceorientation');
            } else {
                console.warn('DeviceOrientation events not supported.');
                alert("Compass features are not supported on this device or browser.");
                headingReadout.textContent = 'N/A'; // Indicate lack of support
            }
        }
    };

    startOrientationListener(); // Attempt to start listening

    // --- Geolocation Watch (for directions & destination bearing) ---
     let routeFetched = false; 
     if (navigator.geolocation) {
        compassWatchId = navigator.geolocation.watchPosition(
            (position) => {
                currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
                
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
        // Remove previous listener if exists
        closeBtn.onclick = null; 
        closeBtn.onclick = () => {
            closeOverlayElement(overlay);
            // Clean up listeners and timers
            if (orientationListener && orientationEventType) {
                window.removeEventListener(orientationEventType, orientationListener, true);
                orientationListener = null;
                orientationEventType = null;
                console.log("Orientation listener removed.");
            }
            if (compassWatchId) {
                navigator.geolocation.clearWatch(compassWatchId);
                compassWatchId = null;
                console.log("Geolocation watch cleared.");
            }
            if (dialAnimationFrameId) {
                cancelAnimationFrame(dialAnimationFrameId);
                dialAnimationFrameId = null;
            }
             if (arrowAnimationFrameId) {
                cancelAnimationFrame(arrowAnimationFrameId);
                arrowAnimationFrameId = null;
            }
            if (radarDestLatLng) silenceDirections(); // Stop speech if navigating
        };
    }

    // --- Navigation UI Logic (Only if destination exists) ---
     if (radarDestLatLng) {
        currentTravelMode=document.querySelector('input[name="travelMode"]:checked')?.value||'DRIVING';
        
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
                if (!dl) return; 
                dl.innerHTML='';
                if(s===google.maps.DirectionsStatus.OK && r && r.routes && r.routes.length > 0 && r.routes[0].legs && r.routes[0].legs.length > 0){
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
                    $("readDirectionsBtn").disabled=false;
                    if (nextStepBtn) { nextStepBtn.disabled=false; nextStepBtn.textContent='Start route'; }
                    setNextStepPointer(0); 
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
                if (currentNavigationIndex >= currentRouteSteps.length && nextStepTextEl) {
                     nextStepTextEl.textContent = "You have arrived!";
                     if (nextStepBtn) nextStepBtn.textContent = 'Arrived';
                     if (nextStepBtn) nextStepBtn.disabled = true;
                }
                return;
            }
            highlightStep(currentNavigationIndex);
            setNextStepPointer(currentNavigationIndex + 1); 
            
            const step=currentRouteSteps[currentNavigationIndex];
            const clean=stripHtml(step.instructions);
            const txt = clean; 
            
            if (txt) { 
                currentSpeechUtterance=new SpeechSynthesisUtterance(txt);
                const voices=speechSynthesis.getVoices();
                const pref=selectedVoiceUri||voiceSelect?.value||'';
                const voice=voices.find(v=>v.voiceURI===pref)||voices[0]; 
                if(voice)currentSpeechUtterance.voice=voice;
                currentSpeechUtterance.pitch=1;
                currentSpeechUtterance.rate=1.1; 
                currentSpeechUtterance.volume=1;
                
                currentSpeechUtterance.onend=()=>{
                    if(!navigationStopped){
                        currentNavigationIndex++;
                        setTimeout(speakNextStep, 750); 
                    }
                    if(rb && rb.textContent==="Reading...") {
                        rb.textContent="🗣️ Read Directions"; 
                        if (!navigationStopped) rb.disabled = true; 
                    }
                };
                currentSpeechUtterance.onerror=(e)=>{
                    console.error('Speech synthesis error:',e);
                    silenceDirections(); 
                };
                speechSynthesis.speak(currentSpeechUtterance);
                 if (rb) rb.disabled = true; 
            } else {
                 if(!navigationStopped){
                        currentNavigationIndex++;
                        setTimeout(speakNextStep, 100); 
                 }
            }
        }
        rb.onclick=readDirections;
        sb.onclick=silenceDirections;
    }
}
