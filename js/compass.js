// --- NEW COMPASS LOGIC (Simplified & Corrected with Gyroscope Support) ---

let compassWatchId = null;
let orientationListener = null;
let orientationEventType = null; // To store the type of event listener used
let motionListener = null; // For gyroscope data
let dialAnimationFrameId = null;
let currentHeading = 0; // The direction the device is facing (0-360)
let hasGyroscope = false; // Track if gyroscope is available

let ringHeadingVisual = 0;
let ringHeadingTarget = 0;
let pitchVisual = 0;
let pitchTarget = 0;
let rollVisual = 0;
let rollTarget = 0;

const PITCH_LIMIT = 55;
const ROLL_LIMIT = 45;
const HEADING_SMOOTH = 0.12;
const TILT_SMOOTH = 0.15;

// --- Navigation Related (Only used if destination is provided) ---
let navigationStopped = true; // Start stopped
let currentRouteSteps = [];
let currentNavigationIndex = 0;
let currentSpeechUtterance = null;
let currentTravelMode = 'DRIVING';
let radarDestLatLng = null; // Store destination LatLng if provided

let silenceDirections = () => {};

// --- Utility Functions ---
function normalizeHeading(heading) {
    if (heading === null || typeof heading === 'undefined') return null;
    let h = heading % 360;
    return h < 0 ? h + 360 : h;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrapAngle = (angle) => (angle % 360 + 360) % 360;
const shortestAngle = (from, to) => ((to - from + 540) % 360) - 180;

// Utility functions are defined in ui.js and available on window object

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
    const needleEl = overlay?.querySelector('.compass-needle') || null;
    const headingReadout = $("compassHeadingValue");
    const destinationReadout = $("compassDestinationLabel");
    const directionsCard = $("compassDirectionsCard");
    const directionsList = $("directionsList");
    const nextStepTextEl = $("nextStepText");
    const nextStepBtn = $("nextStepBtn");
    const showAllBtn = $("showAllStepsBtn");
    const readDirectionsBtn = $("readDirectionsBtn");
    const silenceBtn = $("silenceBtn");
    const speedReadout = $("compassSpeedValue");
    const accuracyReadout = $("compassAccuracyValue");
    const statusContainer = $("compassStatus");
    const statusDot = statusContainer?.querySelector('.status-dot') || null;
    const statusText = $("compassStatusText");
    const sensorBtn = $("compassSensorBtn");
    let resetStepUi = () => {};
    let orientationReady = false;
    let geolocationReady = false;
    const updateSensorStatus = () => {
        if (!statusDot || !statusText) return;
        statusDot.classList.remove('status-good', 'status-warn', 'status-bad');
        if (orientationReady && geolocationReady) {
            statusDot.classList.add('status-good');
            statusText.textContent = 'Heading & GPS locked';
        } else if (orientationReady || geolocationReady) {
            statusDot.classList.add('status-warn');
            statusText.textContent = orientationReady
                ? 'Compass ready — waiting for GPS'
                : 'GPS ready — waiting for compass';
        } else {
            statusDot.classList.add('status-bad');
            statusText.textContent = 'Waiting for sensors…';
        }
        if (sensorBtn) {
            sensorBtn.textContent = (orientationReady && geolocationReady) ? 'Re-center' : 'Enable Sensors';
        }
    };

    if (speedReadout) speedReadout.textContent = '0.0';
    if (accuracyReadout) accuracyReadout.textContent = '—';
    updateSensorStatus();

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
    if (motionListener) {
        window.removeEventListener('devicemotion', motionListener, true);
        motionListener = null;
    }
    if (compassWatchId) {
        navigator.geolocation.clearWatch(compassWatchId);
        compassWatchId = null;
    }
    if (dialAnimationFrameId) {
        cancelAnimationFrame(dialAnimationFrameId);
        dialAnimationFrameId = null;
    }
    currentHeading = 0;
    ringHeadingVisual = ringHeadingTarget = 0;
    pitchVisual = pitchTarget = 0;
    rollVisual = rollTarget = 0;
    if (dial) dial.style.transform = 'rotateZ(0deg)';
    if (needleEl) needleEl.style.transform = 'rotate(0deg)'; // Keep needle pointing up
    headingReadout.textContent = '---\u00B0';
    populateVoices(); 
    navigationStopped = true; 
    speechSynthesis.cancel(); 
    currentRouteSteps = []; 
    currentNavigationIndex = 0;
    radarDestLatLng = null; // Clear previous destination

    // --- Setup Based on Destination ---
    if (destLatLng) {
        const destPlain = window.toPlainLatLng(destLatLng);
        if (destPlain) {
            radarDestLatLng = new google.maps.LatLng(destPlain.lat, destPlain.lng);
            destinationReadout.textContent = destName || 'Loading...';
            if (directionsCard) directionsCard.style.display = 'block';
            if (readDirectionsBtn) readDirectionsBtn.disabled = true;
            if (silenceBtn) silenceBtn.disabled = true;
        } else {
            // Invalid destination passed
            destinationReadout.textContent = 'Invalid Destination';
            if (directionsCard) directionsCard.style.display = 'none';
        }
    } else {
        // No destination - Simple Compass Mode
        destinationReadout.textContent = 'Pointing North';
        if (directionsCard) directionsCard.style.display = 'none';
    }

    overlay.classList.add('active'); 
    document.body.classList.add('modal-open');

    // --- Animation Logic with 3D Gyro Effect ---
    const animateCompass = () => {
        if (!dial) { dialAnimationFrameId = null; return; }

        const headingStep = shortestAngle(ringHeadingVisual, ringHeadingTarget);
        ringHeadingVisual = wrapAngle(ringHeadingVisual + headingStep * HEADING_SMOOTH);

        // Smooth pitch and roll transitions
        pitchVisual += (pitchTarget - pitchVisual) * TILT_SMOOTH;
        rollVisual += (rollTarget - rollVisual) * TILT_SMOOTH;

        // Apply 3D transform: heading (Z-axis), pitch (X-axis), roll (Y-axis)
        const transform = `
            perspective(1000px)
            rotateX(${pitchVisual}deg)
            rotateY(${rollVisual}deg)
            rotateZ(${ringHeadingVisual}deg)
        `;
        
        dial.style.transform = transform;
        
        // Needle stays fixed pointing "up" (North relative to phone) - no rotation applied

        dialAnimationFrameId = requestAnimationFrame(animateCompass);
    };

    const requestCompassAnimation = () => {
        if (!dialAnimationFrameId) {
             dialAnimationFrameId = requestAnimationFrame(animateCompass);
        }
    };

    // --- Sensor Update Handler with Pitch and Roll ---
    const handleOrientation = (event) => {
        let heading = null;
        let beta = event.beta; // Pitch (front-to-back tilt) in degrees from -180 to 180
        let gamma = event.gamma; // Roll (left-to-right tilt) in degrees from -90 to 90

        if (typeof event.webkitCompassHeading === 'number') {
            heading = normalizeHeading(event.webkitCompassHeading);
        } else if (event.absolute === true && typeof event.alpha === 'number') {
            heading = normalizeHeading(event.alpha);
        } else if (typeof event.alpha === 'number') {
            heading = normalizeHeading(360 - event.alpha);
        }

        if (heading === null || Number.isNaN(heading)) return;

        currentHeading = heading;
        ringHeadingTarget = wrapAngle(360 - currentHeading);
        
        // Apply pitch and roll for 3D gyro effect
        if (typeof beta === 'number' && !isNaN(beta)) {
            // Clamp pitch to reasonable limits for visual effect
            pitchTarget = clamp(beta * 0.5, -PITCH_LIMIT, PITCH_LIMIT);
        }
        
        if (typeof gamma === 'number' && !isNaN(gamma)) {
            // Clamp roll to reasonable limits for visual effect
            rollTarget = clamp(gamma * 0.5, -ROLL_LIMIT, ROLL_LIMIT);
        }

        orientationReady = true;
        updateSensorStatus();

        headingReadout.textContent = `${String(Math.round(currentHeading)).padStart(3, '0')}\u00B0`;
        requestCompassAnimation();
    };

    // --- Gyroscope/Motion Handler for enhanced stability ---
    const handleMotion = (event) => {
        if (!event.rotationRate) return;
        
        // rotationRate provides angular velocity in degrees per second
        const { alpha, beta, gamma } = event.rotationRate;
        
        if (alpha !== null && !isNaN(alpha)) {
            // Alpha is rotation around Z-axis (yaw/heading)
            // This can help stabilize compass readings
            hasGyroscope = true;
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
                    orientationReady = false;
                    updateSensorStatus();
                }
            }).catch(error => {
                console.error('Error requesting DeviceOrientation permission:', error);
                 // Fallback for browsers that might error but still support the event
                if ('ondeviceorientationabsolute' in window) { register('deviceorientationabsolute'); }
                else if ('ondeviceorientation' in window) { register('deviceorientation'); }
                 else { alert("Compass features are not supported on this device."); }
                if (!orientationListener) {
                    orientationReady = false;
                    updateSensorStatus();
                }
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
                orientationReady = false;
                updateSensorStatus();
            }
        }
    };

    // --- Start Gyroscope Listener ---
    const startMotionListener = () => {
        if (motionListener) return; // Already listening
        
        if (typeof DeviceMotionEvent !== 'undefined') {
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                // iOS 13+ requires explicit permission
                DeviceMotionEvent.requestPermission().then(permissionState => {
                    if (permissionState === 'granted') {
                        motionListener = handleMotion;
                        window.addEventListener('devicemotion', motionListener, true);
                        console.log('Gyroscope listener registered');
                    } else {
                        console.warn('DeviceMotion permission denied.');
                    }
                }).catch(error => {
                    console.error('Error requesting DeviceMotion permission:', error);
                });
            } else {
                // Non-iOS 13+ or browsers without the permission API
                motionListener = handleMotion;
                window.addEventListener('devicemotion', motionListener, true);
                console.log('Gyroscope listener registered');
            }
        }
    };

    startOrientationListener(); // Attempt to start listening
    startMotionListener(); // Attempt to start gyroscope listening

    // --- Geolocation Watch (primarily for directions, can provide heading fallback) ---
    let routeFetched = false;
    const startGeoWatch = () => {
        if (!navigator.geolocation) {
            geolocationReady = false;
            updateSensorStatus();
            if (radarDestLatLng) {
                resetStepUi('Geolocation is not supported.');
            }
            return;
        }
        if (compassWatchId) return;
        compassWatchId = navigator.geolocation.watchPosition(
            (position) => {
                geolocationReady = true;
                updateSensorStatus();
                currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };

                if (speedReadout) {
                    const speed = (typeof position.coords.speed === 'number' && !Number.isNaN(position.coords.speed)) ? position.coords.speed : 0;
                    speedReadout.textContent = speed.toFixed(1);
                }

                if (accuracyReadout) {
                    accuracyReadout.textContent = (typeof position.coords.accuracy === 'number' && !Number.isNaN(position.coords.accuracy))
                        ? Math.round(position.coords.accuracy).toString()
                        : '—';
                }

                if (orientationListener === null && typeof position.coords.heading === 'number' && !isNaN(position.coords.heading)) {
                    const geoHeading = normalizeHeading(position.coords.heading);
                    if (geoHeading !== null) {
                        currentHeading = geoHeading;
                        ringHeadingTarget = wrapAngle(360 - currentHeading);
                        // Needle stays fixed - no target needed
                        pitchTarget = 0;
                        rollTarget = 0;
                        headingReadout.textContent = `${String(Math.round(currentHeading)).padStart(3, '0')}\u00B0`;
                        requestCompassAnimation();
                    }
                }

                if (radarDestLatLng && !routeFetched) {
                    fetchAndDisplayRoute(currentTravelMode);
                    routeFetched = true;
                }
                if (radarDestLatLng) {
                    const curLatLng = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);
                    const bearing = google.maps.geometry.spherical.computeHeading(curLatLng, radarDestLatLng);
                    destinationReadout.textContent = `${destName} (${String(Math.round(bearing)).padStart(3, '0')}\u00B0)`;
                }
            },
            (error) => {
                geolocationReady = false;
                updateSensorStatus();
                console.error('Geolocation watch error:', error);
                if (speedReadout) speedReadout.textContent = '0.0';
                if (accuracyReadout) accuracyReadout.textContent = '—';
                if (radarDestLatLng && !routeFetched) {
                    resetStepUi(`Location error: ${error.message}`);
                }
            },
            { enableHighAccuracy: true }
        );
    };

    startGeoWatch();

    if (sensorBtn) {
        sensorBtn.onclick = () => {
            startOrientationListener();
            startMotionListener(); // Also start gyroscope
            if (!compassWatchId) {
                startGeoWatch();
            }
            requestCompassAnimation();
        };
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
            if (motionListener) {
                window.removeEventListener('devicemotion', motionListener, true);
                motionListener = null;
            }
            if (compassWatchId) {
                navigator.geolocation.clearWatch(compassWatchId);
                compassWatchId = null;
            }
            if (dialAnimationFrameId) {
                cancelAnimationFrame(dialAnimationFrameId);
                dialAnimationFrameId = null;
            }
            ringHeadingTarget = ringHeadingVisual = 0;
            pitchTarget = pitchVisual = 0;
            rollTarget = rollVisual = 0;
            if (dial) dial.style.transform = 'rotateZ(0deg)';
            if (needleEl) needleEl.style.transform = 'rotate(0deg)'; // Keep needle pointing up
            headingReadout.textContent = '---\u00B0';
            if (radarDestLatLng) silenceDirections(); // Stop speech if navigating
        };
    }

        // --- Navigation UI Logic (Only if destination exists) ---
    if (radarDestLatLng) {
        const ds = new google.maps.DirectionsService();
        const dl = directionsList;
        let nextStepPointer = 0;
        let stepsExpanded = false;

        const collapseStepList = () => {
            if (!dl) return;
            dl.classList.add('collapsed');
            stepsExpanded = false;
            if (showAllBtn) showAllBtn.textContent = 'Show full route';
        };

        const expandStepList = () => {
            if (!dl) return;
            dl.classList.remove('collapsed');
            stepsExpanded = true;
            if (showAllBtn) showAllBtn.textContent = 'Hide steps';
        };

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
            const upcoming = window.stripHtml(currentRouteSteps[nextStepPointer].instructions) || 'Continue on course';
            nextStepTextEl.textContent = upcoming;
            nextStepBtn.disabled = false;
            nextStepBtn.textContent = nextStepPointer === 0 ? 'Start route' : 'Next step';
        };

        const setNextStepPointer = (value) => {
            nextStepPointer = Math.min(value, currentRouteSteps.length);
            updateStepPreview();
        };

        const revealStep = (idx) => {
            if (!dl) return;
            const node = dl.children[idx];
            if (node) node.classList.remove('future-step');
        };

        resetStepUi = (message = 'Waiting for route...') => {
            if (dl) dl.innerHTML = '';
            if (nextStepTextEl) nextStepTextEl.textContent = message;
            if (nextStepBtn) {
                nextStepBtn.disabled = true;
                nextStepBtn.textContent = 'Next step';
            }
            if (readDirectionsBtn) readDirectionsBtn.disabled = true;
            if (showAllBtn) showAllBtn.textContent = 'Show full route';
            setNextStepPointer(0);
            collapseStepList();
        };

        const highlightStep = (idx) => {
            if (!dl) return;
            Array.from(dl.children).forEach((el, i) => {
                const isMatch = i === idx;
                el.classList.toggle('current-step', isMatch);
                if (isMatch) {
                    el.classList.remove('future-step');
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        };

        silenceDirections = () => {
            navigationStopped = true;
            speechSynthesis.cancel();
            if (currentSpeechUtterance) currentSpeechUtterance.onend = null;
            if (readDirectionsBtn) {
                readDirectionsBtn.disabled = (!currentRouteSteps || !currentRouteSteps.length);
                readDirectionsBtn.textContent = '🧭 Read Directions';
            }
            if (silenceBtn) silenceBtn.disabled = true;
        };

        const speakNextStep = () => {
            if (navigationStopped || currentNavigationIndex >= currentRouteSteps.length) {
                silenceDirections();
                if (currentNavigationIndex >= currentRouteSteps.length && nextStepTextEl) {
                    nextStepTextEl.textContent = 'You have arrived!';
                    if (nextStepBtn) {
                        nextStepBtn.textContent = 'Arrived';
                        nextStepBtn.disabled = true;
                    }
                }
                return;
            }

            highlightStep(currentNavigationIndex);
            setNextStepPointer(currentNavigationIndex + 1);

            const step = currentRouteSteps[currentNavigationIndex];
            const instruction = window.stripHtml(step.instructions);

            if (instruction) {
                currentSpeechUtterance = new SpeechSynthesisUtterance(instruction);
                const voices = speechSynthesis.getVoices();
                const pref = selectedVoiceUri || voiceSelect?.value || '';
                const voice = voices.find(v => v.voiceURI === pref) || voices[0];
                if (voice) currentSpeechUtterance.voice = voice;
                currentSpeechUtterance.pitch = 1;
                currentSpeechUtterance.rate = 1.1;
                currentSpeechUtterance.volume = 1;

                currentSpeechUtterance.onend = () => {
                    if (!navigationStopped) {
                        currentNavigationIndex++;
                        setTimeout(speakNextStep, 750);
                    }
                    if (readDirectionsBtn && readDirectionsBtn.textContent === 'Reading...') {
                        readDirectionsBtn.textContent = '🧭 Read Directions';
                        if (!navigationStopped) readDirectionsBtn.disabled = true;
                    }
                };
                currentSpeechUtterance.onerror = (e) => {
                    console.error('Speech synthesis error:', e);
                    silenceDirections();
                };
                speechSynthesis.speak(currentSpeechUtterance);

                if (readDirectionsBtn) readDirectionsBtn.disabled = true;
            } else if (!navigationStopped) {
                currentNavigationIndex++;
                setTimeout(speakNextStep, 100);
            }
        };

        const readDirections = () => {
            if (!currentRouteSteps || !currentRouteSteps.length) return;
            navigationStopped = false;
            if (readDirectionsBtn) {
                readDirectionsBtn.disabled = true;
                readDirectionsBtn.textContent = 'Reading...';
            }
            if (silenceBtn) silenceBtn.disabled = false;
            setNextStepPointer(currentNavigationIndex);
            speakNextStep();
        };

        const fetchAndDisplayRoute = (mode) => {
            if (!dl || !readDirectionsBtn || !silenceBtn) return;
            if (!currentPosition) {
                dl.textContent = 'Waiting for your location…';
                readDirectionsBtn.disabled = true;
                return;
            }
            resetStepUi('Plotting route...');
            dl.textContent = 'Calculating...';
            readDirectionsBtn.disabled = true;
            silenceBtn.disabled = true;

            ds.route(
                { origin: currentPosition, destination: radarDestLatLng, travelMode: google.maps.TravelMode[mode] },
                (r, s) => {
                    if (!dl) return;
                    dl.innerHTML = '';
                    if (s === google.maps.DirectionsStatus.OK && r?.routes?.length && r.routes[0].legs?.length) {
                        currentRouteSteps = r.routes[0].legs[0].steps;
                        currentNavigationIndex = 0;
                        currentRouteSteps.forEach((st, i) => {
                            const row = document.createElement('div');
                            row.dataset.index = i;
                            const icon = getIconForInstruction(st.instructions);
                            const clean = window.stripHtml(st.instructions);
                            row.innerHTML = `<span class="direction-icon">${icon}</span> ${clean}`;
                            row.classList.add('future-step');
                            dl.appendChild(row);
                        });
                        readDirectionsBtn.disabled = false;
                        if (nextStepBtn) {
                            nextStepBtn.disabled = false;
                            nextStepBtn.textContent = 'Start route';
                        }
                        setNextStepPointer(0);
                    } else {
                        dl.textContent = `Route error: ${s}`;
                        currentRouteSteps = [];
                        setNextStepPointer(0);
                        readDirectionsBtn.disabled = true;
                    }
                }
            );
        };

        if (nextStepBtn) {
            nextStepBtn.onclick = () => {
                if (!currentRouteSteps || !currentRouteSteps.length) return;
                const idx = Math.min(nextStepPointer, currentRouteSteps.length - 1);
                highlightStep(idx);
                revealStep(idx);
                setNextStepPointer(idx + 1);
            };
        }

        if (showAllBtn) {
            showAllBtn.onclick = () => {
                if (!dl) return;
                if (stepsExpanded) collapseStepList();
                else {
                    expandStepList();
                    Array.from(dl.children).forEach(el => el.classList.remove('future-step'));
                }
            };
        }

        if (readDirectionsBtn) readDirectionsBtn.onclick = readDirections;
        if (silenceBtn) silenceBtn.onclick = silenceDirections;

        resetStepUi('Waiting for location...');
    } else {
        silenceDirections = () => {};
        resetStepUi = () => {};
    }
}

window.openCompass = openCompass;





