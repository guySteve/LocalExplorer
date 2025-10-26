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
// Radar map variables removed, as we are not using them.
let radarDirectionsRenderer, radarCurrentMarker, radarDestinationMarker, radarDestLatLng = null;

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

// destLatLng is now optional. Pass null for a simple compass.
function openCompass(destLatLng = null) {
        const overlay = $("compassOverlay"); overlay.classList.add('active'); document.body.classList.add('modal-open');
        populateVoices(); navigationStopped=true; speechSynthesis.cancel(); currentRouteSteps=[]; currentNavigationIndex=0;
        
        const directionsCard = $("compassDirectionsCard");
        const directionsPanel = $("directionsPanel");
        const toggleDirectionsBtn = $("toggleDirectionsPanel");
        const dl = $("directionsList");
        const nextStepTextEl = $("nextStepText");
        
        // Find the new simple arrow
        const needle = $("compassArrow");
        
        const resetNeedle = (value = 0) => {
            needleVisualRotation = needleTargetRotation = value;
            if (needle) needle.style.transform = `rotate(${value}deg)`;
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
                needle.style.transform = `rotate(${needleVisualRotation}deg)`;
                needleAnimationFrameId = null;
                return;
            }
            needleVisualRotation = (needleVisualRotation + diff * 0.2 + 360) % 360;
            needle.style.transform = `rotate(${needleVisualRotation}deg)`;
            needleAnimationFrameId = requestAnimationFrame(animateNeedle);
        };

        const requestNeedleAnimation = () => {
            if (!needle) return;
            if (!needleAnimationFrameId) needleAnimationFrameId = requestAnimationFrame(animateNeedle);
        };

        if(orientationListener && orientationEventType) window.removeEventListener(orientationEventType, orientationListener, true);
        orientationListener = null;
        orientationEventType = null;
        
        let destPlain = null;
        radarDestLatLng = null;

        // Check if we have a destination
        if (destLatLng) {
            destPlain = toPlainLatLng(destLatLng);
            if (destPlain) {
                radarDestLatLng = new google.maps.LatLng(destPlain.lat, destPlain.lng);
            }
            directionsCard.style.display = 'block'; // Show directions card
            if (compassLabels.destination) compassLabels.destination.textContent = 'Set a place'; // Will be updated by showDetails
        } else {
            // No destination, just a simple compass
            directionsCard.style.display = 'none'; // Hide directions card
            if (compassLabels.destination) compassLabels.destination.textContent = 'Pointing North';
            if (compassLabels.heading) compassLabels.heading.textContent = '---°';
        }

        // --- THIS IS THE KEY FIX for "Compass Not Working" ---
        function updateCompassNeedle(ev, override = {}) {
            if (!needle) return; 
            
            try {
                let deviceHeading = null;
                if (ev && typeof ev.webkitCompassHeading !== 'undefined') {
                    deviceHeading = normalizeHeading(ev.webkitCompassHeading); // iOS
                } else if (ev && typeof ev.alpha !== 'undefined') {
                    deviceHeading = normalizeHeading(360 - ev.alpha); // Standard
                }

                if (deviceHeading !== null) {
                    lastDeviceHeading = deviceHeading;
                }
                
                if (typeof override.heading === 'number') {
                    deviceHeading = normalizeHeading(override.heading);
                }
                
                if (deviceHeading === null && lastDeviceHeading !== null) deviceHeading = lastDeviceHeading;
                if (deviceHeading === null && lastGeolocationHeading !== null) deviceHeading = lastGeolocationHeading;

                if (deviceHeading === null) return; // No heading data yet

                let rotation = 0;
                
                if (radarDestLatLng && currentPosition) {
                     // We have a destination, point to it (old logic)
                    const curLatLng = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);
                    const bearing = google.maps.geometry.spherical.computeHeading(curLatLng, radarDestLatLng);
                    rotation = normalizeHeading(bearing - (deviceHeading ?? 0)) ?? 0;
                     if (compassLabels.heading) {
                        const formatted = String(Math.round(bearing)).padStart(3, '0');
                        compassLabels.heading.textContent = `${formatted}°`;
                    }
                } else {
                    // No destination, just point North
                    rotation = normalizeHeading(0 - deviceHeading) ?? 0;
                    if (compassLabels.heading) {
                        const formatted = String(Math.round(deviceHeading)).padStart(3, '0');
                        compassLabels.heading.textContent = `${formatted}°`;
                    }
                }

                needleTargetRotation = rotation;
                requestNeedleAnimation();
                
            } catch(e){ console.error("Heading error:",e); }
        }

        const startOrientationListener = () => {
            if (orientationListener) return; 
            
            const handler = (event) => updateCompassNeedle(event);
            
            const register = (eventName) => {
                orientationEventType = eventName;
                orientationListener = handler;
                window.addEventListener(eventName, orientationListener, true);
            };

            // --- THIS IS THE PERMISSION REQUEST ---
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission().then(r => {
                    if (r === 'granted') {
                        register('deviceorientation');
                    } else {
                        console.warn("Orientation permission denied.");
                        alert("Compass permission denied. Please grant permission in your device settings.");
                    }
                }).catch(e => { 
                    console.error("Orientation permission error:", e);
                    // Fallback for browsers that error on requestPermission but still work
                    if ('ondeviceorientation' in window) { register('deviceorientation'); }
                });
            } else if ('ondeviceorientationabsolute' in window) {
                register('deviceorientationabsolute'); // Chrome on Android
            } else if ('ondeviceorientation' in window) {
                register('deviceorientation'); // Standard
            } else {
                console.warn("Orientation not supported.");
                alert("Compass features are not supported on this device.");
            }
        };
        // --- END OF PERMISSION REQUEST ---
        
        startOrientationListener();

        let routeFetched = false; 

        if(navigator.geolocation){
            if(compassWatchId)navigator.geolocation.clearWatch(compassWatchId);
            compassWatchId=navigator.geolocation.watchPosition(p=>{
                currentPosition={lat:p.coords.latitude,lng:p.coords.longitude};
                
                let headingUpdated = false;
                if (typeof p.coords.heading === 'number' && !Number.isNaN(p.coords.heading)) {
                    lastGeolocationHeading = normalizeHeading(p.coords.heading);
                    headingUpdated = true;
                }

                // Call update to point needle to destination (if it exists)
                // or update heading readout for North-pointer
                updateCompassNeedle(); 
                
                // If we have a destination, fetch the route
                if (radarDestLatLng && !routeFetched) {
                    fetchAndDisplayRoute(currentTravelMode);
                    routeFetched = true;
                }
            },e=>console.error("Watch err:",e),{enableHighAccuracy:true});
        }

        // All the directions logic only applies if we have a destination
        if (!radarDestLatLng) {
            // No destination, so just return.
            const cb=$("closeCompassBtn");
            cb.onclick=()=>{
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
            };
            return; 
        }

        // --- Code below only runs if we HAVE a destination ---
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
            ds.route({origin:currentPosition,destination:radarDestLatLng,travelMode:google.maps.TravelMode[mode]},(r,s)=>{dl.innerHTML='';if(s===google.maps.DirectionsStatus.OK&&r){currentRouteSteps=r.routes[0].legs[0].steps;currentNavigationIndex=0;currentRouteSteps.forEach((st,i)=>{const d=document.createElement('div');d.dataset.index=i;const ic=getIconForInstruction(st.instructions);d.innerHTML=`<span class="direction-icon">${ic}</span> ${st.instructions}`;d.classList.add('future-step');dl.appendChild(d);});$("readDirectionsBtn").disabled=false;if (nextStepBtn) { nextStepBtn.disabled=false; nextStepBtn.textContent='Start route'; }setNextStepPointer(0);}else{dl.textContent=`Route error: ${s}`;currentRouteSteps=[];setNextStepPointer(0);}}); }
        
        const rb=$("readDirectionsBtn"),sb=$("silenceBtn"),cb=$("closeCompassBtn"),tmr=document.querySelectorAll('input[name="travelMode"]');
        function readDirections(){if(!currentRouteSteps||currentRouteSteps.length===0)return;navigationStopped=false;rb.disabled=true;rb.textContent="Reading...";sb.disabled=false;setNextStepPointer(currentNavigationIndex);speakNextStep();}
        function silenceDirections(){navigationStopped=true;speechSynthesis.cancel();if(currentSpeechUtterance)currentSpeechUtterance.onend=null;rb.disabled=(currentRouteSteps.length===0);rb.textContent="🔊 Read Directions";sb.disabled=true;}
        function highlightStep(idx){if(!dl)return;Array.from(dl.children).forEach((el,i)=>{const isMatch=i===idx;el.classList.toggle('current-step',isMatch);if(isMatch){el.classList.remove('future-step');el.scrollIntoView({behavior:'smooth',block:'nearest'});}});}
        function speakNextStep(){if(navigationStopped||currentNavigationIndex>=currentRouteSteps.length){silenceDirections();return;}highlightStep(currentNavigationIndex);setNextStepPointer(currentNavigationIndex+1);const step=currentRouteSteps[currentNavigationIndex];const clean=stripHtml(step.instructions);const txt=`Step ${currentNavigationIndex+1}: ${clean}.`;currentSpeechUtterance=new SpeechSynthesisUtterance(txt);const voices=speechSynthesis.getVoices();const pref=selectedVoiceUri||voiceSelect?.value||'';const voice=voices.find(v=>v.voiceURI===pref)||voices[0];if(voice)currentSpeechUtterance.voice=voice;currentSpeechUtterance.pitch=1;currentSpeechUtterance.rate=1;currentSpeechUtterance.volume=1;currentSpeechUtterance.onend=()=>{if(!navigationStopped){currentNavigationIndex++;setTimeout(speakNextStep,1500);}if(rb.textContent==="Reading..."){rb.textContent="🔊 Read Directions";if(!navigationStopped)rb.disabled=true;}};currentSpeechUtterance.onerror=(e)=>{console.error('Speech err:',e);silenceDirections();};speechSynthesis.speak(currentSpeechUtterance);if(currentNavigationIndex===0&&rb.textContent==="Reading..."){setTimeout(()=>{if(rb.textContent==="Reading...")rb.textContent="🔊 Read Directions";},500);}}
        rb.onclick=readDirections;sb.onclick=silenceDirections;
        tmr.forEach(r=>{r.onchange=(e)=>{const newM=e.target.value;if(newM!==currentTravelMode){currentTravelMode=newM;silenceDirections();routeFetched=false; // Allow refetch for new mode
fetchAndDisplayRoute(currentTravelMode);}};});

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
            silenceDirections();
        };
    }
