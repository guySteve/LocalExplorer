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
    save: function(key) {
        const data = JSON.stringify(this[key]);
        const storageKey = this.STORAGE_KEYS[key.replace(/([A-Z])/g, '_$1').toUpperCase()];
        if (storageKey) {
            localStorage.setItem(storageKey, data);
        }
    },
    toggleSavedPlace: function(place) {
        if (!place || !place.place_id) return;
        if (this.savedPlaces[place.place_id]) {
            delete this.savedPlaces[place.place_id];
        } else {
            this.savedPlaces[place.place_id] = { name: place.name, vicinity: place.vicinity };
        }
        this.save('savedPlaces');
    },
    addToDayPlan: function(place) {
        if (place && place.place_id && !this.dayPlan.some(p => p.place_id === place.place_id)) {
            this.dayPlan.push({ name: place.name, place_id: place.place_id });
            this.save('dayPlan');
        }
    },
    grantAchievement: function(badgeId) {
        if (!this.achievements.has(badgeId)) {
            this.achievements.add(badgeId);
            this.save('achievements');
            UI.showNotification(`🏆 Achievement Unlocked: ${badgeId}`);
        }
    }
};
