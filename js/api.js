/* js/api.js */
const ApiService = {
  getPlaceDetails(placeId) {
    const fields = [
      "name","rating","user_ratings_total","price_level","photos","website",
      "vicinity","types","formatted_phone_number","geometry","reviews","place_id"
    ];
    return new Promise((resolve, reject) => {
      AppState.services.places.getDetails({ placeId, fields }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) resolve(place);
        else reject(status);
      });
    });
  },

  nearbySearch({ location, radius = 10000, type, keyword }) {
    return new Promise((resolve, reject) => {
      const req = { location: new google.maps.LatLng(location.lat, location.lng), radius };
      if (type) req.type = [type];
      if (keyword) req.keyword = keyword;

      AppState.services.places.nearbySearch(req, (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && Array.isArray(results)) {
          resolve(results || []);
        } else {
          reject(status || "NEARBY_FAILED");
        }
      });
    });
  },

  geocode({ location, address }) {
    return new Promise((resolve, reject) => {
      const req = location ? { location } : { address };
      AppState.services.geocoder.geocode(req, (results, status) => {
        if (status === "OK" && results?.length) resolve(results);
        else reject(status || "GEOCODE_FAILED");
      });
    });
  },

  // Cheap, offline “fun fact” fallback (avoids extra APIs/cost).
  // Uses reverse geocode locality/state to surface a themed blurb.
  async getFunFact(coords) {
    try {
      const results = await this.geocode({ location: coords });
      const addr = results[0]?.address_components || [];
      const city = addr.find(c => c.types.includes("locality"))?.long_name;
      const state = addr.find(c => c.types.includes("administrative_area_level_1"))?.short_name;

      const funs = [
        `Did you know? People rate hidden spots higher within 2 miles of ${city || "you"} after 6pm.`,
        `${city || "This area"} has a surprisingly strong coffee density—try an indie cafe before noon.`,
        `Locals in ${state || "your state"} love parks with water views—search “Quiet Spots”.`,
        `Pro tip: Hit museums in the last hour for fewer crowds and cheaper parking.`
      ];
      return funs[Math.floor(Math.random() * funs.length)];
    } catch {
      return "Pro tip: Filter first, then tap a result for reviews, photos, and a map link.";
    }
  }
};
