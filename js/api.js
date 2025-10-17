const ApiService = {
    nearbySearch: function(request) {
        return new Promise((resolve, reject) => {
            AppState.services.places.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) resolve(results);
                else reject(status);
            });
        });
    },
    getPlaceDetails: function(placeId) {
        const fields = ['name', 'rating', 'photos', 'vicinity', 'geometry', 'place_id'];
        return new Promise((resolve, reject) => {
            AppState.services.places.getDetails({ placeId, fields }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) resolve(place);
                else reject(status);
            });
        });
    },
    geocode: function(request) {
        return new Promise((resolve, reject) => {
            AppState.services.geocoder.geocode(request, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK) resolve(results);
                else reject(status);
            });
        });
    },
    getFunFact: async function(coords) {
        try {
            const geoURL = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gslimit=1&gscoord=${coords.lat}|${coords.lng}&format=json&origin=*`;
            const geoRes = await fetch(geoURL);
            const geoData = await geoRes.json();
            const pageId = geoData?.query?.geosearch[0]?.pageid;
            if (!pageId) return "No local facts found.";
            const exURL = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json&origin=*`;
            const exRes = await fetch(exURL);
            const exData = await exRes.json();
            return exData?.query?.pages[pageId]?.extract;
        } catch {
            return "Local facts unavailable.";
        }
    }
};
