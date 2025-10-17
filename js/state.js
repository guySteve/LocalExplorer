const AppState = {
    currentUserLocation: null,
    currentPlace: null,
    currentResults: [],
    services: { places: null, geocoder: null, panorama: null },
    savedPlaces: {},
    dayPlan: [],
    achievements: new Set(),

    // --- Restored from Original ---
    subFilterMap: {
        eat: { "🍕 Surprise Me": { type: "restaurant" }, "Italian": { type: "italian_restaurant", keyword: "italian" }, "Mexican": { type: "mexican_restaurant", keyword: "mexican" }, "Japanese": { type: "japanese_restaurant", keyword: "japanese" }, "Chinese": { type: "chinese_restaurant", keyword: "chinese" }, "Indian": { type: "indian_restaurant", keyword: "indian" }, "Pizza": { type: "pizza_restaurant", keyword: "pizza" }, "Cafes": { type: "cafe", keyword: "cafe" }, "Desserts": { type: "bakery", keyword: "dessert bakery" } },
        see: { "Museums": { type: "museum" }, "Art Galleries": { type: "art_gallery" }, "Tourist Attractions": { type: "tourist_attraction" } },
        night: { "Bars": { type: "bar" }, "Night Clubs": { type: "night_club" } },
        gems: { "Quirky Shops": { keyword: "vintage store" }, "Indie Coffee": { type: "cafe" }, "Local Art": { type: "art_gallery" }, "Quiet Spots": { type: "park" } },
        pets: { "Dog Park": { type: "park", keyword: "dog" }, "Pet Store": { type: "pet_store" }, "Veterinarian": { type: "veterinary_care" } },
        utilities: { "Hospital": { type: "hospital" }, "Pharmacy": { type: "pharmacy" }, "Police": { type: "police" }, "Gas Station": { type: "gas_station" }, "Car Rental": { type: "car_rental" }, "ATM": { type: "atm" } },
        dark: { "Cemeteries": { type: "cemetery" }, "Haunted Tours": { type: "tourist_attraction", keyword: "ghost tour haunted tour" }, "Haunted Sites": { type: "tourist_attraction", keyword: "haunted site haunted house" }, "Crime Museums": { type: "museum", keyword: "crime history museum" } }
    },
    // --- End of Restored Section ---

    STORAGE_KEYS: {
        SAVED_PLACES: 'local_explorer.saved_places.v2',
        DAY_PLAN: 'local_explorer.day_plan.v1',
        ACHIEVEMENTS: 'local_explorer.achievements.v1',
    },

    load: function() {
        this.savedPlaces = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SAVED_PLACES)) || {};
        this.dayPlan = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DAY_PLAN)) || [];
        this.achievements = new Set(JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ACHIEVEMENTS)) || []);
    },

    // ... (rest of the functions in this file remain the same) ...
    save: function(key) { /*...*/ },
    toggleSavedPlace: function(place) { /*...*/ },
    addToDayPlan: function(place) { /*...*/ },
    grantAchievement: function(badgeId) { /*...*/ }
};
