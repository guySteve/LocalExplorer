const ApiService = {
    getPlaceDetails: function(placeId) {
        // Request all fields needed for the detailed view
        const fields = ['name', 'rating', 'user_ratings_total', 'price_level', 'photos', 'website', 'vicinity', 'types', 'formatted_phone_number', 'geometry', 'reviews', 'url'];
        return new Promise((resolve, reject) => {
            AppState.services.places.getDetails({ placeId, fields }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    resolve(place);
                } else {
                    reject(status);
                }
            });
        });
    },
    // ... other functions (nearbySearch, geocode, getFunFact) remain the same
    nearbySearch: function(request) { /* ... */ },
    geocode: function(request) { /* ... */ },
    getFunFact: async function(coords) { /* ... */ }
};
