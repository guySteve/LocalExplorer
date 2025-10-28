function prepareStreetViewPreview(latLng) {
      pendingStreetViewLatLng = latLng || null;
      const sheet = $("detailsSheet");
      if (sheet) sheet.classList.remove('streetview-active');
      if (!latLng && compassLabels.destination) compassLabels.destination.textContent = 'Set a place';
      const btn = $("activateStreetViewBtn");
      if (btn) {
        btn.disabled = !latLng;
        btn.textContent = '👁️ Street View';
        btn.style.opacity = latLng ? '1' : '0.6';
      }
      if (streetViewPanorama) streetViewPanorama.setVisible(false);
    }

function hasMapSupport() {
      return typeof mapsReady !== 'undefined' && mapsReady && typeof google !== 'undefined' && google.maps;
    }

function activateStreetViewPeek() {
      if (!hasMapSupport() || !pendingStreetViewLatLng) return;
      const btn = $("activateStreetViewBtn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Loading...';
      }
      const sheet = $("detailsSheet");
      const latLngLiteral = toPlainLatLng(pendingStreetViewLatLng);
      if (!latLngLiteral) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '👁️ Street View';
        }
        return;
      }
      const targetLatLng = new google.maps.LatLng(latLngLiteral.lat, latLngLiteral.lng);
      const streetService = new google.maps.StreetViewService();
      streetService.getPanorama({ location: targetLatLng, radius: 50 }, (data, status) => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '👁️ Street View';
        }
        if (status !== google.maps.StreetViewStatus.OK) {
          alert('Street View is not available for this location.');
          return;
        }
        const panoOpts = data?.location
          ? { pano: data.location.pano, pov: { heading: 270, pitch: 0 }, zoom: 1 }
          : { position: targetLatLng, pov: { heading: 0, pitch: 0 }, zoom: 0 };
        if (!streetViewPanorama) {
          streetViewPanorama = new google.maps.StreetViewPanorama($("detailsMap"), panoOpts);
        } else {
          if (panoOpts.pano) streetViewPanorama.setPano(panoOpts.pano);
          streetViewPanorama.setPosition(panoOpts.position || targetLatLng);
          streetViewPanorama.setPov(panoOpts.pov);
          streetViewPanorama.setZoom(panoOpts.zoom);
        }
        streetViewPanorama.setVisible(true);
        sheet?.classList.add('streetview-active');
      });
    }

function onLocationSuccess(position) { /* Geolocation success */
      if (!hasMapSupport()) {
          window.__pendingGeolocationPosition = position;
          return;
      }
      const manual = $("manualInputContainer");
      if (manual) manual.style.display = 'none';
      currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
      try {
          reverseGeocode(currentPosition); // Get address from coordinates
      } catch (err) {
          console.error("CRITICAL: reverseGeocode failed. 'geocoder' variable is likely undefined.", err);
          // Manually call the fallback display if reverseGeocode crashes
          const coordsLabel = `${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`;
          $("locationDisplay").innerHTML = `<span style="font-size:0.85rem;">${coordsLabel}</span>`;
          if (compassLabels.location) compassLabels.location.textContent = coordsLabel;
          latestLocationLabel = ''; 
          updateWeatherTitle(); 
          updateWeather(currentPosition);
      }
    }

function onLocationError(err) { /* Geolocation failed */
      console.warn('Geolocation failed', err);
      const locationDisplay = $("locationDisplay");
      if (locationDisplay) {
        const fallback = err?.message ? `Location unavailable: ${err.message}` : 'Enter a location to begin';
        locationDisplay.textContent = fallback;
      }
      showManualInput(); // Show manual input field
      setWeatherPlaceholder('Enter a location to see the latest weather.');
    }

function showManualInput() { /* Show manual location input */
      const container = $("manualInputContainer");
      if (!container) return;
      container.style.display = 'block';
      const input = $("manualInput");
      if (!input) return;
      if (input.dataset.listenerAttached === 'true') return; // Prevent multiple listeners
      input.dataset.listenerAttached = 'true';
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const addr = input.value.trim();
          if (addr) { setWeatherPlaceholder('Looking up weather...'); geocodeAddress(addr); }
        }
      });
    }

function geocodeAddress(address) { /* Get coords from address */
      if (!hasMapSupport() || typeof geocoder === 'undefined' || !geocoder) {
        alert('Map services are not available. Please try again later.');
        return;
      }
      geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          currentPosition = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
          currentAddress = results[0].formatted_address;
          displayLocation(results[0], currentPosition);
          updateWeather(currentPosition, { force: true });
        } else alert('Location not found. Please try again.');
      });
    }

function reverseGeocode(pos) { /* Get address from coords */
      if (!hasMapSupport() || !geocoder) {
         console.error("CRITICAL: geocoder is not available in reverseGeocode.");
         // This will show the manual input box if the first bug is still somehow present
         onLocationError({ message: "Geocoder service not ready." }); 
         return;
      }
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === 'OK' && results[0]) {
          currentAddress = results[0].formatted_address;
          displayLocation(results[0], pos);
          updateWeather(pos);
        } else { 
          // Geocode failed (e.g., API key issue, no address for location)
          console.warn(`Reverse geocode failed with status: ${status}`);
          $("locationDisplay").textContent = "Could not find address. Enter manually.";
          showManualInput(); // Give the user a way forward
          
          // Still update weather using the coords
          latestLocationLabel = ''; 
          updateWeatherTitle(); 
          updateWeather(pos);
        }
      });
    }

function displayLocation(result, pos) { /* Update UI with location */
        let city = '', state = '';
        if (result.address_components) {
            result.address_components.forEach(comp => {
            if (comp.types.includes('locality')) city = comp.long_name;
            if (comp.types.includes('administrative_area_level_1')) state = comp.short_name || comp.long_name;
            });
        }
        let locStr = city && state ? `${city}, ${state}` : city || state || currentAddress;
        latestLocationLabel = locStr.replace(/[<>]/g, ''); // Sanitize
        $("locationDisplay").innerHTML = `${locStr}<br><span style="font-size:0.75rem; opacity:0.8;">${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}</span>`;
        if (compassLabels.location) compassLabels.location.textContent = locStr ? `Near ${locStr}` : 'Awaiting course';
        updateWeatherTitle();
    }

function performSearch(category, item) { /* Perform Google Places search */
      if (!currentPosition) return alert('Please provide a location first.');
      if (category === 'Local Events') return searchLocalEvents(item); // Handle events separately
      
      // Handle FourSquare searches
      if (item.useFourSquare) {
        return searchFourSquareNearby(currentPosition.lat, currentPosition.lng, item.query || '', 20)
          .then(results => {
            if (results && results.length > 0) {
              // Convert FourSquare results to a format compatible with displayResults
              const convertedResults = results.map(place => ({
                name: place.name,
                place_id: place.fsq_id, // Use FourSquare ID
                rating: null, // FourSquare API v3 doesn't include ratings in search
                user_ratings_total: null,
                vicinity: place.address,
                formatted_address: place.address,
                geometry: place.lat && place.lng ? {
                  location: {
                    lat: () => place.lat,
                    lng: () => place.lng
                  }
                } : null,
                _isFourSquare: true // Flag to identify FourSquare results
              }));
              
              lastResultsTitle = item.name || category;
              currentResults = convertedResults;
              displayResults(lastResultsTitle, convertedResults);
            } else {
              alert('No results found.');
            }
          })
          .catch(err => {
            console.error('FourSquare search failed:', err);
            alert('Search failed. Please try again.');
          });
      }
      
      if (!hasMapSupport() || !placesService) {
        alert('Map services are not available. Please try again later.');
        return;
      }
      
      const request = { 
        location: new google.maps.LatLng(currentPosition.lat, currentPosition.lng), 
        radius: item.radius || 7000, 
        type: item.type || undefined, 
        keyword: item.keyword || item.name, // Use keyword or name
        rankBy: item.rankBy || google.maps.places.RankBy.PROMINENCE 
      };
      
      lastResultsTitle = item.name || category;
      appendNextResults = false;
      setLoadMoreState(null);
      
      placesService.nearbySearch(request, (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const minRating = item.minRating ?? 4.2;
          const minReviews = item.minReviews ?? 20;

          // 1. Filter by rating
          let filtered = item.ignoreRating ? results : results.filter(p => (p.rating || 0) >= minRating && (p.user_ratings_total || 0) >= minReviews);

          // 2. Filter by primary type
          if (item.primaryTypeOnly && item.type) {
            filtered = filtered.filter(p => p.types && p.types.includes(item.type));
          }
          
          if (!filtered.length && !item.primaryTypeOnly) {
             filtered = results.slice(0, 8);
          }

          filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.user_ratings_total || 0) - (a.user_ratings_total || 0));
          
          if (appendNextResults) {
            currentResults = currentResults.concat(filtered); displayResults(lastResultsTitle, filtered, { append: true });
          } else {
            currentResults = filtered; displayResults(lastResultsTitle, filtered);
          }
          appendNextResults = false;
          setLoadMoreState(pagination);
        } else {
          if (!appendNextResults) alert('No results found.');
          appendNextResults = false;
          setLoadMoreState(null);
        }
      });
    }

function showDetails(placeId) { /* Show place details sheet */
      if (!hasMapSupport() || !placesService) {
        alert('Map services are not available. Please try again later.');
        return;
      }
      placesService.getDetails({ placeId: placeId, fields: ['name','formatted_address','formatted_phone_number','rating','reviews','price_level','geometry','website','url','opening_hours','place_id'] }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          currentPlaceDetails = place; const loc = place.geometry.location;
          
          prepareStreetViewPreview(loc);
          
          $("detailsName").textContent = place.name || 'No Name';
          let stars = ''; if (place.rating) { const full = Math.floor(place.rating), half = (place.rating - full) >= 0.5; stars = '★'.repeat(full) + (half ? '½' : '') + ` (${place.rating.toFixed(1)})`; }
          $("detailsRating").innerHTML = `<span class="stars">${stars}</span>`;
          $("detailsPrice").textContent = place.price_level ? '$'.repeat(place.price_level) : '';
          $("detailsPhone").textContent = place.formatted_phone_number || '';
          $("detailsAddress").textContent = place.formatted_address || '';
          
          // Fetch What3Words address
          const what3wordsDiv = $("detailsWhat3Words");
          const what3wordsText = $("detailsWhat3WordsText");
          if (what3wordsDiv && what3wordsText && loc) {
            what3wordsDiv.style.display = 'block';
            what3wordsText.textContent = 'Loading...';
            fetchWhat3Words(loc.lat(), loc.lng()).then(w3w => {
              if (w3w) {
                what3wordsText.textContent = w3w;
                what3wordsText.style.fontWeight = '600';
                what3wordsText.style.color = 'var(--accent)';
              } else {
                what3wordsDiv.style.display = 'none';
              }
            }).catch(() => {
              what3wordsDiv.style.display = 'none';
            });
          }
          
          updateSaveButtonState(place.place_id); updatePlanButtonState(place.place_id);
          $("mapsBtn").onclick = () => window.open(place.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`, '_blank');
          $("websiteBtn").style.display = place.website ? 'inline-flex' : 'none';
          $("websiteBtn").onclick = () => { if (place.website) window.open(place.website, '_blank'); };
          $("shareBtn").onclick = () => { if (navigator.share) navigator.share({ title: place.name, text: place.formatted_address, url: place.url || window.location.href }).catch(console.error); else alert('Sharing not supported.'); };
          
          // --- UPDATED: Pass place.name to openCompass ---
          $("guideBtn").onclick = () => {
          if (window.launchCompass) window.launchCompass(loc, place.name);
          else if (window.openCompass) window.openCompass(loc, place.name);
          else alert('Compass is still loading. Please try again in a moment.');
        };
          
          populateReviews(place.reviews || []); populateHours(place.opening_hours);
          $("detailsSheet").classList.add('active'); document.body.classList.add('modal-open');
        } else console.error("Place details request failed:", status);
      });
    }

let detailsSheetBound = false;
function initDetailsSheetInteractions() {
      if (detailsSheetBound) return;
      const sheet = $("detailsSheet");
      if (!sheet) return;
      detailsSheetBound = true;
      const closeBtn = $("closeDetailsBtn");
      if (closeBtn) closeBtn.onclick = closeDetails;
      sheet.addEventListener('click', (e) => { if (e.target === sheet) closeDetails(); });
      const streetBtn = $("activateStreetViewBtn");
      if (streetBtn) streetBtn.onclick = activateStreetViewPeek;
      enableSwipeDismiss({
        container: sheet,
        dragTarget: sheet,
        scrollElement: $("detailsContent"),
        onDismiss: closeDetails,
        threshold: 110,
        maxOffset: 320
      });
    }


