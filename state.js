/***************************************************************************************************
* APPLICATION STATE MANAGER
*
* Manages all dynamic data for the application. This acts as the single source of truth.
* It also handles loading from and saving to localStorage.
***************************************************************************************************/

const AppState = {
    // --- Core Properties ---
    currentUserLocation: null,      // {lat, lng} object
    currentLocality: '',            // Formatted string like "Brooklyn, NY"
    currentPlace: null,             // The full details object of the currently viewed place
    currentResults: [],             // Array of search results
    
    // --- API & Service Status ---
    services: {
        places: null,
        geocoder: null,
        directions: null,
        panorama: null,
    },

    // --- User Data (Persisted) ---
    savedPlaces: {},                // Object mapping place_id to {name, vicinity}
    dayPlan: [],                    // Array of place objects for the day's itinerary
    achievements: new Set(),        // A set of earned badge IDs (e.g., 'FIRST_FIND')
    voiceSettings: {
        name: '',
        rate: 1.0,
    },

    // --- Constants for Local Storage ---
    STORAGE_KEYS: {
        SAVED_PLACES: 'local_explorer.saved_places.v2',
        DAY_PLAN: 'local_explorer.day_plan.v1',
        ACHIEVEMENTS: 'local_explorer.achievements.v1',
        VOICE: 'local_explorer.voice_settings.v1',
    },

    /**
     * Initializes the state by loading all data from localStorage.
     * This should be called once when the app starts.
     */
    load: function() {
        // Load Saved Places
        const saved = localStorage.getItem(this.STORAGE_KEYS.SAVED_PLACES);
        this.savedPlaces = saved ? JSON.parse(saved) : {};

        // Load Day Plan
        const plan = localStorage.getItem(this.STORAGE_KEYS.DAY_PLAN);
        this.dayPlan = plan ? JSON.parse(plan) : [];

        // Load Achievements
        const badges = localStorage.getItem(this.STORAGE_KEYS.ACHIEVEMENTS);
        this.achievements = badges ? new Set(JSON.parse(badges)) : new Set();
        
        // Load Voice Settings
        const voice = localStorage.getItem(this.STORAGE_KEYS.VOICE);
        this.voiceSettings = voice ? JSON.parse(voice) : { name: '', rate: 1.0 };
        
        console.log("App state loaded from localStorage.");
    },

    /**
     * Saves a specific piece of state to localStorage.
     * @param {string} key The key of the state to save (e.g., 'savedPlaces').
     */
    save: function(key) {
        switch (key) {
            case 'savedPlaces':
                localStorage.setItem(this.STORAGE_KEYS.SAVED_PLACES, JSON.stringify(this.savedPlaces));
                break;
            case 'dayPlan':
                localStorage.setItem(this.STORAGE_KEYS.DAY_PLAN, JSON.stringify(this.dayPlan));
                break;
            case 'achievements':
                localStorage.setItem(this.STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify([...this.achievements]));
                break;
            case 'voiceSettings':
                localStorage.setItem(this.STORAGE_KEYS.VOICE, JSON.stringify(this.voiceSettings));
                break;
            default:
                console.error(`Unknown key provided to AppState.save: ${key}`);
        }
    },

    /**
     * Toggles a place in the saved list and persists the change.
     * @param {object} place The place object to save or remove.
     * @returns {boolean} True if the place is now saved, false otherwise.
     */
    toggleSavedPlace: function(place) {
        if (!place || !place.place_id) return false;

        if (this.savedPlaces[place.place_id]) {
            delete this.savedPlaces[place.place_id];
            this.save('savedPlaces');
            return false;
        } else {
            this.savedPlaces[place.place_id] = {
                name: place.name,
                vicinity: place.vicinity || place.formatted_address,
                url: place.url
            };
            this.save('savedPlaces');
            return true;
        }
    },

    /**
     * Adds a place to the day plan if it's not already there.
     * @param {object} place The place object to add.
     */
    addToDayPlan: function(place) {
        if (place && place.place_id && !this.dayPlan.some(p => p.place_id === place.place_id)) {
            this.dayPlan.push(place);
            this.save('dayPlan');
        }
    },

    /**
     * Awards a new achievement if it hasn't been earned already.
     * @param {string} badgeId The unique ID of the badge to award.
     */
    grantAchievement: function(badgeId) {
        if (!this.achievements.has(badgeId)) {
            this.achievements.add(badgeId);
            this.save('achievements');
            // We'll need a UI function to show a notification for the new badge
            // UI.showBadgeNotification(badgeId);
            console.log(`Achievement Granted: ${badgeId}`);
        }
    }
};
