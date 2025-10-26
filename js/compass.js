let compassWatchId = null;
let lastDeviceHeading = null;
let lastGeolocationHeading = null;
let orientationEventType = null;
let needleAnimationFrameId = null;
let needleVisualRotation = 0;
let needleTargetRotation = 0;
let navigationStopped = true; // Start as stopped
let isNavigating = false; // Separate state for active navigation
let currentRouteSteps = [];
let currentNavigationIndex = 0;
let currentSpeechUtterance = null;
let currentTravelMode = 'DRIVING';
let orientationListener = null;
let radarMap, radarDirectionsRenderer, radarCurrentMarker, radarDestinationMarker, radarDestLatLng = null;
let currentTargetLatLng = null; // NEW: The lat/lng of the current step target

function getIconForInstruction(instruction) {
      const lowerInstruction = instruction.toLowerCase();
      // Replaced emoji with clearer text/unicode symbols
      if (lowerInstruction.includes('turn left')) return '↖';
      if (lowerInstruction.includes('turn right')) return '↗';
      if (lowerInstruction.includes('keep left')) return '↰';
      if (lowerInstruction.includes('keep right')) return '↱';
      if (lowerInstruction.includes('straight')) return '↑';
      if (lowerInstruction.includes('merge')) return '⤸';
      if (lowerInstruction.includes('roundabout') || lowerInstruction.includes('traffic circle')) return '↻';
      if (lowerInstruction.includes('exit')) return '↘';
      if (lowerInstruction.includes('destination')) return '🏁';
      return '➡️'; // Default
    }

// Helper function to speak arbitrary text
function speakText(text) {
    if (navigationStopped) return;
    const txt = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const pref = selectedVoiceUri || voiceSelect?.value || '';
    const voice = voices.find(v => v.voiceURI === pref) || voices[0];
    if (voice) txt.voice = voice;
    txt.pitch = 1;
    txt.rate = 1;
    txt.volume = 1;
    txt.onerror = (e) => { console.error('Speech err:', e); silenceDirections(); };
    speechSynthesis.speak(txt);
}

function openCompass(destLatLng) { // `destLatLng` can be LatLngLiteral or google.maps.LatLng
        const overlay = $("compassOverlay"); overlay.classList.add('active'); document.body.classList.add('modal-open');
        populateVoices(); navigationStopped=true; isNavigating=false; // Reset navigation state
        speechSynthesis.cancel(); currentRouteSteps=[]; currentNavigationIndex=0;
        $("readDirectionsBtn").disabled=true; $("silenceBtn").disabled=true;
        const dl = $("directionsList");
        if (dl) { dl.innerHTML='Calibrating…'; }
        
        // Remove 'collapsed' class logic
        if (dl) dl.innerHTML='Calibrating…';

        const needle = $("compassNeedle");
        const resetNeedle = (value = 0) => {
            needleVisualRotation = needleTargetRotation = value;
            if (needle) needle.style.transform = `translateX(-50%) rotate(${value}deg)`;
        };
        if (needle) {
            if (needleAnimationFrameId) cancelAnimationFrame(needleAnimationFrameId);
            needleAnimationFrameId = null;
            resetNeedle(0);
        }
        const animateNeedle = () => {
            if (!needle) { needleAnimationFrameId = null; return; }
            const diff = ((needleTargetRotation - needleVisualRotation + 540) % 360) - 180;
            if (Math.abs(diff) < 0.15) {
                needleVisualRotation = needleTargetRotation;
                needle.style.transform = `translateX(-50%) rotate(${needleVisualRotation}deg)`;
                needleAnimationFrameId = null;
                return;
            }
            needleVisualRotation = (needleVisualRotation + diff * 0.2 + 360) % 360;
            needle.style.transform = `translateX(-50%) rotate(${needleVisualRotation}deg)`;
            needleAnimationFrameId = requestAnimationFrame(animateNeedle);
        };
        const requestNeedleAnimation = () => {
            if (!needle) return;
            if (!needleAnimationFrameId) needleAnimationFrameId = requestAnimationFrame(animateNeedle);
        };
        const destPlain = toPlainLatLng(destLatLng);
        if (!destPlain) { alert('Unable to load destination.'); return; }
        radarDestLatLng = new google.maps.LatLng(destPlain.lat, destPlain.lng);
        currentTargetLatLng = radarDestLatLng; // Default target is final destination
        currentTravelMode=document.querySelector('input[name="travelMode"]:checked')?.value||'DRIVING';
        if(orientationListener && orientationEventType) window.removeEventListener(orientationEventType, orientationListener, true);
        orientationListener = null;
        orientationEventType = null;

        const ensureRadarMap = () => {
            const mapHost = $("radarMap");
            if (!mapHost || typeof google === 'undefined') return;
            if (!radarMap) {
                radarMap = new google.maps.Map(mapHost, {
                    center: radarDestLatLng,
                    zoom: 14,
                    disableDefaultUI: true,
                    gestureHandling: 'none',
                    backgroundColor: '#0f1624',
                    styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }, { featureType: 'transit', stylers: [{ visibility: 'off' }] }]
                });
            }
            if (!radarDirectionsRenderer) {
                radarDirectionsRenderer = new google.maps.DirectionsRenderer({
                    map: radarMap,
                    suppressMarkers: true,
                    preserveViewport: true,
                    polylineOptions: { strokeColor: '#c87941', strokeWeight: 4 }
                });
            } else {
                radarDirectionsRenderer.setMap(radarMap);
            }
            if (!radarDestinationMarker) {
                radarDestinationMarker = new google.maps.Marker({
                    map: radarMap,
                    position: radarDestLatLng,
                    zIndex: 1,
                    icon: { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 5, strokeColor: '#c87941', fillColor: '#c87941', fillOpacity: 1 }
                });
            } else radarDestinationMarker.setPosition(radarDestLatLng);
            const zoomSlider = $("radarZoom");
            if (zoomSlider && radarMap) zoomSlider.value = radarMap.getZoom();
        };
        const refreshRadarOrigin = () => {
            if (!radarMap || !currentPosition) return;
            const origin = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);
            if (!radarCurrentMarker) {
                radarCurrentMarker = new google.maps.Marker({
                    map: radarMap,
                    zIndex: 2,
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 5, strokeWeight: 2, strokeColor: '#8fd8ff', fillColor: '#8fd8ff', fillOpacity: 1 }
                });
            }
            radarCurrentMarker.setPosition(origin);
        };
        ensureRadarMap();
        refreshRadarOrigin();
        updateCompassNeedle();

        function updateCompassNeedle(ev, override = {}) {
            if (!currentPosition || !radarDestLatLng || !needle) return;
            try {
                const curLatLng = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);
                
                // CORE FIX: Target the current step OR the final destination
                const target = isNavigating ? (currentTargetLatLng || radarDestLatLng) : radarDestLatLng;
                const bearing = google.maps.geometry.spherical.computeHeading(curLatLng, target);
                
                let deviceHeading = null;
                if (ev) {
                    const derived = deriveHeadingFromEvent(ev);
                    if (derived !== null) {
                        lastDeviceHeading = derived;
                        deviceHeading = derived;
                    }
                }
                if (typeof override.heading === 'number') {
                    deviceHeading = normalizeHeading(override.heading);
                }
                if (deviceHeading === null && lastDeviceHeading !== null) deviceHeading = lastDeviceHeading;
                if (deviceHeading === null && lastGeolocationHeading !== null) deviceHeading = lastGeolocationHeading;
                const course = normalizeHeading(bearing) ?? 0;
                const rotation = normalizeHeading(bearing - (deviceHeading ?? 0)) ?? 0;
                needleTargetRotation = rotation;
                requestNeedleAnimation();
                if (compassLabels.heading) {
                    const formatted = String(Math.round(course)).padStart(3, '0');
                    compassLabels.heading.textContent = `${formatted}°`;
                }
            } catch(e){ console.error("Heading error:",e); }
        }

        const startOrientationListener = () => {
            if (orientationListener) return; // Prevent duplicates if somehow called again
            const handler = (event) => updateCompassNeedle(event);
            const register = (eventName) => {
                orientationEventType = eventName;
                orientationListener = handler;
                window.addEventListener(eventName, orientationListener, true);
            };
            if (window.DeviceOrientationEvent?.requestPermission) {
                window.DeviceOrientationEvent.requestPermission().then(r => {
                    if (r === 'granted') register('deviceorientation');
                    else { console.warn("Orientation permission denied."); }
                }).catch(e => { console.error("Orientation permission error:", e); });
            }
            else if ('ondeviceorientationabsolute' in window) { register('deviceorientationabsolute'); }
            else if ('ondeviceorientation' in window) { register('deviceorientation'); }
            else { console.warn("Orientation not supported."); }
        };
        startOrientationListener();

        if(navigator.geolocation){
            if(compassWatchId)navigator.geolocation.clearWatch(compassWatchId);
            compassWatchId=navigator.geolocation.watchPosition(p=>{
                currentPosition={lat:p.coords.latitude,lng:p.coords.longitude};
                if (typeof p.coords.heading === 'number' && !Number.isNaN(p.coords.heading)) {
                    lastGeolocationHeading = normalizeHeading(p.coords.heading);
                }

                // --- START NEW AUTO-NAVIGATION LOGIC ---
                if (isNavigating && currentRouteSteps.length > 0 && currentNavigationIndex < currentRouteSteps.length) {
                    const currentStep = currentRouteSteps[currentNavigationIndex];
                    // Target the *start* of the current step
                    const stepStartTarget = currentStep.start_location; 
                    const currentLatLng = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);

                    currentTargetLatLng = stepStartTarget; // Update compass target

                    const distanceToStepStart = google.maps.geometry.spherical.computeDistanceBetween(currentLatLng, stepStartTarget);

                    // Proximity threshold to trigger step completion (e.g., 25 meters)
                    if (distanceToStepStart < 25) {
                        // Advance to the next step
                        currentNavigationIndex++;
                        if (currentNavigationIndex < currentRouteSteps.length) {
                            const nextStep = currentRouteSteps[currentNavigationIndex];
                            currentTargetLatLng = nextStep.start_location; // Set compass to *next* step's start
                            speakNextStep(true); // Speak the new instruction
                            highlightStep(currentNavigationIndex);
                        } else {
                            // Reached destination
                            speakText("You have arrived at your destination.");
                            silenceDirections();
                            currentTargetLatLng = radarDestLatLng; // Point compass at final spot
                        }
                    }
                }
                // --- END NEW AUTO-NAVIGATION LOGIC ---

                updateCompassNeedle();
                refreshRadarOrigin();
            },e=>console.error("Watch err:",e),{enableHighAccuracy:true});
        }

        const ds=new google.maps.DirectionsService();
        let stepsExpanded = false; // Kept for potential future use, but button is gone

        const collapseStepList = () => { if (dl) dl.classList.add('collapsed'); stepsExpanded = false; };
        const expandStepList = () => { if (dl) dl.classList.remove('collapsed'); stepsExpanded = true; };

        const revealStep = (idx) => { if (!dl) return; const node = dl.children[idx]; if (node) node.classList.remove('future-step'); };
        const resetStepUi = (message = 'Waiting for route...') => {
            if (dl) dl.innerHTML = message;
            // No more nextStepBtn
            collapseStepList();
        };
        resetStepUi('Calibrating route...');

        // Removed nextStepBtn and showAllStepsBtn click handlers

        function fetchAndDisplayRoute(mode){
            if (!dl) return;
            if (!currentPosition) {
                dl.textContent = 'Waiting for your location…';
                $("readDirectionsBtn").disabled = true;
                return;
            }
            resetStepUi('Plotting route...');
            dl.innerHTML='Calibrating…';
            $("readDirectionsBtn").disabled=true;
            ds.route({origin:currentPosition,destination:radarDestLatLng,travelMode:google.maps.TravelMode[mode]},(r,s)=>{dl.innerHTML='';if(s===google.maps.DirectionsStatus.OK&&r){
                currentRouteSteps=r.routes[0].legs[0].steps;
                currentNavigationIndex=0;
                // CORE FIX: Set initial compass target to the start of the first step
                if (currentRouteSteps.length > 0) {
                    currentTargetLatLng = currentRouteSteps[0].start_location;
                }
                currentRouteSteps.forEach((st,i)=>{const d=document.createElement('div');d.dataset.index=i;const ic=getIconForInstruction(st.instructions);d.innerHTML=`<span class="direction-icon">${ic}</span> ${st.instructions}`;d.classList.add('future-step');dl.appendChild(d);});
                $("readDirectionsBtn").disabled=false;
                // No more nextStepBtn
                refreshRadarOrigin();
                if(radarDirectionsRenderer){radarDirectionsRenderer.setDirections(r);radarDirectionsRenderer.setRouteIndex(0);}
                if(radarMap&&currentPosition){const bounds=new google.maps.LatLngBounds();bounds.extend(new google.maps.LatLng(currentPosition.lat,currentPosition.lng));bounds.extend(radarDestLatLng);radarMap.fitBounds(bounds);}
            }else{dl.textContent=`Route error: ${s}`;currentRouteSteps=[]; currentTargetLatLng = radarDestLatLng;}}); }
        
        fetchAndDisplayRoute(currentTravelMode);

        const rb=$("readDirectionsBtn"),sb=$("silenceBtn"),cb=$("closeCompassBtn"),stb=$("compassSettingsBtn"),ac=$("advancedCompassControls"),tmr=document.querySelectorAll('input[name="travelMode"]');
        function readDirections(){
            if(!currentRouteSteps||currentRouteSteps.length===0)return;
            isNavigating=true; navigationStopped=false;
            rb.disabled=true;rb.textContent="Reading...";sb.disabled=false;
            currentNavigationIndex = 0; // Start from the beginning
            currentTargetLatLng = currentRouteSteps[0]?.start_location; // Target first step
            speakNextStep(true); // Force speak the first step
            highlightStep(0);
        }
        function silenceDirections(){
            isNavigating=false; navigationStopped=true;
            speechSynthesis.cancel();
            if(currentSpeechUtterance)currentSpeechUtterance.onend=null;
            rb.disabled=(currentRouteSteps.length===0);rb.textContent="🔊 Read Directions";sb.disabled=true;
        }
        function highlightStep(idx){if(!dl)return;Array.from(dl.children).forEach((el,i)=>{const isMatch=i===idx;el.classList.toggle('current-step',isMatch);if(isMatch){el.classList.remove('future-step');el.scrollIntoView({behavior:'smooth',block:'nearest'});}});}
        
        function speakNextStep(forceSpeak = false){
            if(((navigationStopped || currentNavigationIndex >= currentRouteSteps.length)) && !forceSpeak){
                silenceDirections();
                return;
            }
            highlightStep(currentNavigationIndex);
            // setNextStepPointer(currentNavigationIndex+1); // REMOVED
            const step=currentRouteSteps[currentNavigationIndex];
            const clean=stripHtml(step.instructions);
            const txt=`${clean}.`; // Simpler speech
            currentSpeechUtterance=new SpeechSynthesisUtterance(txt);
            const voices=speechSynthesis.getVoices();
            const pref=selectedVoiceUri||voiceSelect?.value||'';
            const voice=voices.find(v=>v.voiceURI===pref)||voices[0];
            if(voice)currentSpeechUtterance.voice=voice;
            currentSpeechUtterance.pitch=1;currentSpeechUtterance.rate=1;currentSpeechUtterance.volume=1;
            
            // MODIFIED: onend no longer advances. It just resets the button state.
            currentSpeechUtterance.onend=()=>{
                // if(!navigationStopped){currentNavigationIndex++;setTimeout(speakNextStep,1500);} // REMOVED AUTO-ADVANCE
                if(rb.textContent==="Reading..."){rb.textContent="🔊 Read Directions";if(!navigationStopped)rb.disabled=true;}
            };
            currentSpeechUtterance.onerror=(e)=>{console.error('Speech err:',e);silenceDirections();};
            speechSynthesis.speak(currentSpeechUtterance);
            
            if(currentNavigationIndex===0&&rb.textContent==="Reading..."){setTimeout(()=>{if(rb.textContent==="Reading...")rb.textContent="🔊 Read Directions";},500);}}
        
        rb.onclick=readDirections;sb.onclick=silenceDirections;
        stb.onclick=()=>{ac.style.display=ac.style.display==='none'?'block':'none';};
        tmr.forEach(r=>{r.onchange=(e)=>{const newM=e.target.value;if(newM!==currentTravelMode){currentTravelMode=newM;silenceDirections();fetchAndDisplayRoute(currentTravelMode);}};});
        const brightnessSlider = $("radarBrightness"); if(brightnessSlider) brightnessSlider.oninput=()=>{const n=$("compassNeedle");if(n)n.style.filter=`brightness(${brightnessSlider.value/100})`;};
        const zoomSlider = $("radarZoom"); if (zoomSlider) {
            if (radarMap) zoomSlider.value = radarMap.getZoom();
            zoomSlider.oninput = () => { if (radarMap) radarMap.setZoom(parseInt(zoomSlider.value, 10) || radarMap.getZoom()); };
        }

        cb.onclick=()=>{
            // Removed directionsPanel toggle logic
            closeOverlayElement(overlay);
            if(compassWatchId) navigator.geolocation.clearWatch(compassWatchId); compassWatchId=null;
            if(orientationListener && orientationEventType) {
                window.removeEventListener(orientationEventType, orientationListener, true);
                orientationListener=null;
                orientationEventType=null;
            }
            if (needleAnimationFrameId) {
                cancelAnimationFrame(needleAnimationFrameId);
                needleAnimationFrameId = null;
            }
            silenceDirections(); ac.style.display='none';
            currentTargetLatLng = null; // Clear target
        };
    }
