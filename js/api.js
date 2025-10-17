/***************************************************************************************************
* EXTERNAL API MANAGER
*
* Handles all communication with external services like Google Maps and Wikipedia.
* This keeps all network request logic in one clean, manageable place.
***************************************************************************************************/

const ApiService = {
    
    /**
     * Performs a nearby search for places using the Google Places API.
     * @param {object} request The request object for the nearbySearch.
     * @returns {Promise<Array>} A promise that resolves with an array of place results.
     */
    nearbySearch: function(request) {
        return new Promise((resolve, reject) => {
            AppState.services.places.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK || status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    resolve(results || []);
                } else {
                    console.error('Nearby Search failed:', status);
                    reject(status);
                }
            });
        });
    },

    /**
     * Fetches detailed information for a specific place by its Place ID.
     * @param {string} placeId The Google Place ID.
     * @returns {Promise<object>} A promise that resolves with the full place details object.
     */
    getPlaceDetails: function(placeId) {
        const fields = ['name', 'rating', 'user_ratings_total', 'price_level', 'photos', 'website', 'vicinity', 'formatted_address', 'types', 'formatted_phone_number', 'geometry', 'wheelchair_accessible_entrance', 'reviews', 'url'];
        return new Promise((resolve, reject) => {
            AppState.services.places.getDetails({ placeId, fields }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    resolve(place);
                } else {
                    console.error('Get Place Details failed:', status);
                    reject(status);
                }
            });
        });
    },

    /**
     * Geocodes a location query string or reverse-geocodes coordinates.
     * @param {object} request The request for the geocoder (e.g., {address: '...'} or {location: ...}).
     * @returns {Promise<Array>} A promise that resolves with an array of geocoding results.
     */
    geocode: function(request) {
        return new Promise((resolve, reject) => {
            AppState.services.geocoder.geocode(request, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK) {
                    resolve(results);
                } else {
                    console.error('Geocode failed:', status);
                    reject(status);
                }
            });
        });
    },

    /**
     * Calculates a walking route between an origin and a destination.
     * @param {object} origin A LatLng object for the start point.
     * @param {object} destination A LatLng object for the end point.
     * @returns {Promise<object>} A promise that resolves with the directions result object.
     */
    getDirections: function(origin, destination) {
         const request = {
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.WALKING
        };
        return new Promise((resolve, reject) => {
            AppState.services.directions.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    resolve(result);
                } else {
                    console.error('Directions request failed:', status);
                    reject(status);
                }
            });
        });
    },

    /**
     * Fetches a fun fact from Wikipedia based on geographical coordinates.
     * @param {object} coords The {lat, lng} coordinates.
     * @returns {Promise<string>} A promise that resolves with a fun fact string.
     */
    getFunFact: async function(coords) {
        try {
            const geoURL = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gslimit=10&gscoord=${coords.lat}|${coords.lng}&format=json&origin=*`;
            const geoResponse = await fetch(geoURL);
            const geoData = await geoResponse.json();
            const pageIds = (geoData?.query?.geosearch || []).map(p => p.pageid).slice(0, 10);

            if (!pageIds.length) {
                return "No local facts found nearby.";
            }

            const extractURL = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageIds.join('|')}&format=json&origin=*`;
            const extractResponse = await fetch(extractURL);
            const extractData = await extractResponse.json();
            const pages = extractData?.query?.pages || {};
            const facts = Object.values(pages)
                .map(p => p.extract)
                .filter(e => e && e.length > 60 && e.length < 300); // Filter for concise, interesting facts

            return facts[0] || "No local facts found nearby.";
        } catch (error) {
            console.error('Failed to fetch fun fact:', error);
            return "Local facts are currently unavailable.";
        }
    }
};
