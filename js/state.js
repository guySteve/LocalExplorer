const AppState = {
    currentUserLocation: null,
    currentPlace: null,
    currentResults: [],
    services: { places: null, geocoder: null, panorama: null },
    savedPlaces: {},
    dayPlan: [],
    achievements: new Set(),
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
        localStorage.setItem(storageKey, data);
    },
    toggleSavedPlace: function(place) {
        if (this.savedPlaces[place.place_id]) delete this.savedPlaces[place.place_id];
        else this.savedPlaces[place.place_id] = { name: place.name, vicinity: place.vicinity };
        this.save('savedPlaces');
    },
    addToDayPlan: function(place) {
        if (!this.dayPlan.some(p => p.place_id === place.place_id)) {
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
