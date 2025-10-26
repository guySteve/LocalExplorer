let compassWatchId = null;
let lastDeviceHeading = null;
let lastGeolocationHeading = null;
let orientationEventType = null;
let needleAnimationFrameId = null;
let needleVisualRotation = 0;
let needleTargetRotation = 0;
let navigationStopped = false;
let currentRouteSteps = [];
let currentNavigationIndex = 0;
let currentSpeechUtterance = null;
let currentTravelMode = 'DRIVING';
let orientationListener = null;
let radarMap, radarDirectionsRenderer, radarCurrentMarker, radarDestinationMarker, radarDestLatLng = null;

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

function openCompass(destLatLng) { // `destLatLng` can be LatLngLiteral or google.maps.LatLng
        const overlay = $("compassOverlay"); overlay.classList.add('active'); document.body.classList.add('modal-open');
        populateVoices(); navigationStopped=true; speechSynthesis.cancel(); currentRouteSteps=[]; currentNavigationIndex=0;
        $("readDirectionsBtn").disabled=true; $("silenceBtn").disabled=true;
        const dl = $("directionsList");
        const directionsPanel = $("directionsPanel");
        const toggleDirectionsBtn = $("toggleDirectionsPanel");
        if (dl) { dl.innerHTML='Calibrating…'; dl.classList.add('collapsed'); }
        const nextStepTextEl = $("nextStepText");
        if (nextStepTextEl) nextStepTextEl.textContent = 'Calibrating route...';
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
            // We no longer need radarDestLatLng, so we only check for the needle.
            if (!needle) return; 
            
            try {
                // Destination-related calculations are removed.
                // const curLatLng = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);
                // const bearing = google.maps.geometry.spherical.computeHeading(curLatLng, radarDestLatLng);

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

                // If we still don't have a heading, we can't rotate.
                if (deviceHeading === null) return;

                // const course = normalizeHeading(bearing) ?? 0; // No longer needed

                // --- This is the key change ---
                // Old logic pointed to the destination:
                // const rotation = normalizeHeading(bearing - (deviceHeading ?? 0)) ?? 0;
                
                // New logic points the needle North by applying the *opposite* of the device's heading:
                const rotation = normalizeHeading(0 - deviceHeading) ?? 0;
                // --- End of key change ---

                needleTargetRotation = rotation;
                requestNeedleAnimation();

                if (compassLabels.heading) {
                    // Old logic showed destination bearing:
                    // const formatted = String(Math.round(course)).padStart(3, '0');
                    
                    // New logic shows the device's heading:
                    const formatted = String(Math.round(deviceHeading)).padStart(3, '0');
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

        let routeFetched = false; // <-- Flag to prevent multiple fetches

        if(navigator.geolocation){
            if(compassWatchId)navigator.geolocation.clearWatch(compassWatchId);
            compassWatchId=navigator.geolocation.watchPosition(p=>{
                currentPosition={lat:p.coords.latitude,lng:p.coords.longitude};
                
                let headingUpdated = false;
                if (typeof p.coords.heading === 'number' && !Number.isNaN(p.coords.heading)) {
                    lastGeolocationHeading = normalizeHeading(p.coords.heading);
                    headingUpdated = true;
                }

                // Only call update if device orientation fails AND we got a new heading
                if (lastDeviceHeading === null && headingUpdated) {
                    updateCompassNeedle(); 
                }
                
                refreshRadarOrigin();

                // NOW fetch the route, since we have a position
                if (!routeFetched) {
                    fetchAndDisplayRoute(currentTravelMode);
                    routeFetched = true;
                }
            },e=>console.error("Watch err:",e),{enableHighAccuracy:true});
        }

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
                nextStepTextEl.textContent = 'All clear. Enjoy the stop!';
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
            nextStepPointer = Math.min(value, currentRouteSteps.length);
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
        resetStepUi('Calibrating route...');

        if (nextStepBtn) nextStepBtn.onclick = () => {
            if (!currentRouteSteps || !currentRouteSteps.length) return;
            const idx = Math.min(nextStepPointer, currentRouteSteps.length - 1);
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
            if (!dl) return;
            if (!currentPosition) {
                dl.textContent = 'Waiting for your location…';
                $("readDirectionsBtn").disabled = true;
                return;
            }
            resetStepUi('Plotting route...');
            dl.innerHTML='Calibrating…';
            $("readDirectionsBtn").disabled=true;
            ds.route({origin:currentPosition,destination:radarDestLatLng,travelMode:google.maps.TravelMode[mode]},(r,s)=>{dl.innerHTML='';if(s===google.maps.DirectionsStatus.OK&&r){currentRouteSteps=r.routes[0].legs[0].steps;currentNavigationIndex=0;currentRouteSteps.forEach((st,i)=>{const d=document.createElement('div');d.dataset.index=i;const ic=getIconForInstruction(st.instructions);d.innerHTML=`<span class="direction-icon">${ic}</span> ${st.instructions}`;d.classList.add('future-step');dl.appendChild(d);});$("readDirectionsBtn").disabled=false;if (nextStepBtn) { nextStepBtn.disabled=false; nextStepBtn.textContent='Start route'; }setNextStepPointer(0);refreshRadarOrigin();if(radarDirectionsRenderer){radarDirectionsRenderer.setDirections(r);radarDirectionsRenderer.setRouteIndex(0);}if(radarMap&&currentPosition){const bounds=new google.maps.LatLngBounds();bounds.extend(new google.maps.LatLng(currentPosition.lat,currentPosition.lng));bounds.extend(radarDestLatLng);radarMap.fitBounds(bounds);}}else{dl.textContent=`Route error: ${s}`;currentRouteSteps=[];setNextStepPointer(0);}}); }
        // We no longer call fetchAndDisplayRoute(currentTravelMode); here. It's called by watchPosition.

        const rb=$("readDirectionsBtn"),sb=$("silenceBtn"),cb=$("closeCompassBtn"),stb=$("compassSettingsBtn"),ac=$("advancedCompassControls"),tmr=document.querySelectorAll('input[name="travelMode"]');
        function readDirections(){if(!currentRouteSteps||currentRouteSteps.length===0)return;navigationStopped=false;rb.disabled=true;rb.textContent="Reading...";sb.disabled=false;setNextStepPointer(currentNavigationIndex);speakNextStep();}
        function silenceDirections(){navigationStopped=true;speechSynthesis.cancel();if(currentSpeechUtterance)currentSpeechUtterance.onend=null;rb.disabled=(currentRouteSteps.length===0);rb.textContent="🔊 Read Directions";sb.disabled=true;}
        function highlightStep(idx){if(!dl)return;Array.from(dl.children).forEach((el,i)=>{const isMatch=i===idx;el.classList.toggle('current-step',isMatch);if(isMatch){el.classList.remove('future-step');el.scrollIntoView({behavior:'smooth',block:'nearest'});}});}
        function speakNextStep(){if(navigationStopped||currentNavigationIndex>=currentRouteSteps.length){silenceDirections();return;}highlightStep(currentNavigationIndex);setNextStepPointer(currentNavigationIndex+1);const step=currentRouteSteps[currentNavigationIndex];const clean=stripHtml(step.instructions);const txt=`Step ${currentNavigationIndex+1}: ${clean}.`;currentSpeechUtterance=new SpeechSynthesisUtterance(txt);const voices=speechSynthesis.getVoices();const pref=selectedVoiceUri||voiceSelect?.value||'';const voice=voices.find(v=>v.voiceURI===pref)||voices[0];if(voice)currentSpeechUtterance.voice=voice;currentSpeechUtterance.pitch=1;currentSpeechUtterance.rate=1;currentSpeechUtterance.volume=1;currentSpeechUtterance.onend=()=>{if(!navigationStopped){currentNavigationIndex++;setTimeout(speakNextStep,1500);}if(rb.textContent==="Reading..."){rb.textContent="🔊 Read Directions";if(!navigationStopped)rb.disabled=true;}};currentSpeechUtterance.onerror=(e)=>{console.error('Speech err:',e);silenceDirections();};speechSynthesis.speak(currentSpeechUtterance);if(currentNavigationIndex===0&&rb.textContent==="Reading..."){setTimeout(()=>{if(rb.textContent==="Reading...")rb.textContent="🔊 Read Directions";},500);}}
        rb.onclick=readDirections;sb.onclick=silenceDirections;
        stb.onclick=()=>{ac.style.display=ac.style.display==='none'?'block':'none';};
        tmr.forEach(r=>{r.onchange=(e)=>{const newM=e.target.value;if(newM!==currentTravelMode){currentTravelMode=newM;silenceDirections();routeFetched=false; // Allow refetch for new mode
fetchAndDisplayRoute(currentTravelMode);}};});
        const brightnessSlider = $("radarBrightness"); if(brightnessSlider) brightnessSlider.oninput=()=>{const n=$("compassNeedle");if(n)n.style.filter=`brightness(${brightnessSlider.value/100})`;};
        const zoomSlider = $("radarZoom"); if (zoomSlider) {
            if (radarMap) zoomSlider.value = radarMap.getZoom();
            zoomSlider.oninput = () => { if (radarMap) radarMap.setZoom(parseInt(zoomSlider.value, 10) || radarMap.getZoom()); };
        }

        cb.onclick=()=>{
            if (directionsPanel) {
                directionsPanel.classList.remove('open');
                directionsPanel.setAttribute('aria-hidden', 'true');
            }
            if (toggleDirectionsBtn) {
                toggleDirectionsBtn.textContent = 'Show directions';
                toggleDirectionsBtn.setAttribute('aria-expanded', 'false');
            }
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
        };
    }
