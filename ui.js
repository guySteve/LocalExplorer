/***************************************************************************************************
* UI CONTROLLER
*
* Handles all direct manipulation of the DOM, event listeners, and rendering logic.
* It keeps the application state (AppState) and API logic (ApiService) separate from the
* presentation layer.
***************************************************************************************************/

const UI = {
    // --- Element References (cached for performance) ---
    elements: {},

    /**
     * Caches all necessary DOM element references on startup.
     */
    cacheElements: function() {
        this.elements.locationStatus = document.getElementById('location-status');
        this.elements.funFactText = document.getElementById('fun-fact-text');
        this.elements.filterContainer = document.getElementById('filter-container');
        this.elements.resultScreen = document.getElementById('result-screen');
        this.elements.placeName = document.getElementById('place-name');
        // ... cache all other frequently accessed elements here
    },

    /**
     * Initializes all event listeners for the application.
     */
    initEventListeners: function() {
        // Main category filter clicks
        this.elements.filterContainer.addEventListener('click', (e) => {
            const filterButton = e.target.closest('button[data-filter]');
            if (filterButton) {
                const category = filterButton.dataset.filter;
                // In a real app, you would show a sub-menu here
                console.log(`Category selected: ${category}`);
                // For now, let's just trigger a search for "restaurant"
                this.findAndDisplayPlaces({ type: 'restaurant' }, category, 'Restaurants');
            }
        });

        // Example: Add listener for a "Try Again" button on the result screen
        // document.getElementById('try-again-button').addEventListener('click', () => this.showNextSuggestion());
    },

    /**
     * High-level function to orchestrate a place search and display the results.
     * @param {object} params Search parameters for the API.
     * @param {string} category The parent category.
     * @param {string} label The display label for the search.
     */
    findAndDisplayPlaces: async function(params, category, label) {
        this.updateStatus('Searching nearby...');
        try {
            const results = await ApiService.nearbySearch({
                location: AppState.currentUserLocation,
                radius: 5000, // 5km search radius
                ...params
            });
            
            AppState.currentResults = results;
            
            if (results.length > 0) {
                this.showNextSuggestion();
                // When a search is successful, grant the 'FIRST_FIND' achievement
                AppState.grantAchievement('FIRST_FIND');
            } else {
                this.updateStatus('No results found. Try a different category!');
            }
        } catch (error) {
            this.updateStatus('Could not complete search. Please try again.');
        }
    },
    
    /**
     * Displays the next available place from the currentResults list.
     */
    showNextSuggestion: async function() {
        if (AppState.currentResults.length === 0) {
            this.updateStatus('No more suggestions!');
            this.elements.resultScreen.style.display = 'none';
            return;
        }

        // Pop the first result off the array to show it
        const placeSummary = AppState.currentResults.shift();

        try {
            this.updateStatus('Loading details...');
            const placeDetails = await ApiService.getPlaceDetails(placeSummary.place_id);
            AppState.currentPlace = placeDetails;
            this.renderPlaceCard(placeDetails);
        } catch (error) {
            // If details fail, just try the next one
            this.showNextSuggestion(); 
        }
    },

    /**
     * Renders the details of a place into the main result card.
     * @param {object} place The full place details object.
     */
    renderPlaceCard: function(place) {
        this.elements.placeName.textContent = place.name;
        // ... update rating, price, photos, etc.
        
        // Update the save button state
        const saveButton = document.getElementById('save-place-button');
        const isSaved = !!AppState.savedPlaces[place.place_id];
        saveButton.textContent = isSaved ? '★ Saved' : '☆ Save';
        
        this.elements.resultScreen.style.display = 'flex';
        
        // Initialize gestures on the newly displayed card
        const card = document.getElementById('result-card');
        GestureManager.init(card);
    },

    /**
     * Updates the main status message shown to the user.
     * @param {string} text The message to display.
     */
    updateStatus: function(text) {
        this.elements.locationStatus.textContent = text;
    },

    /**
     * Main initialization method for the UI module.
     */
    init: function() {
        this.cacheElements();
        this.initEventListeners();
    }
};
