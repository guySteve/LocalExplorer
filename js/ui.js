/***************************************************************************************************
* UI CONTROLLER
*
* Handles all direct manipulation of the DOM, event listeners, and rendering logic.
***************************************************************************************************/

const UI = {
    elements: {},

    cacheElements: function() {
        this.elements.locationStatus = document.getElementById('location-status');
        this.elements.funFactText = document.getElementById('fun-fact-text');
        this.elements.filterContainer = document.getElementById('filter-container');
        this.elements.resultScreen = document.getElementById('result-screen');
        this.elements.resultCard = document.getElementById('result-card');
        this.elements.placeName = document.getElementById('place-name');
        this.elements.compassModal = document.getElementById('compass-modal');
        this.elements.compassDist = document.getElementById('compass-dist');
        this.elements.dayPlanModal = document.getElementById('day-plan-modal');
        this.elements.dayPlanList = document.getElementById('day-plan-list');
    },

    initEventListeners: function() {
        this.elements.filterContainer.addEventListener('click', (e) => {
            const filterButton = e.target.closest('button[data-filter]');
            if (filterButton) {
                const params = JSON.parse(filterButton.dataset.filter);
                this.findAndDisplayPlaces(params, 'Category', filterButton.textContent);
            }
        });

        // Use event delegation for buttons inside the result card
        this.elements.resultCard.addEventListener('click', (e) => {
            if (e.target.closest('#compass-button')) this.openCompass();
            if (e.target.closest('#save-place-button')) this.toggleSaveCurrentPlace();
        });
        
        document.getElementById('close-compass').addEventListener('click', () => this.closeCompass());
        document.getElementById('open-day-plan-button').addEventListener('click', () => this.showDayPlan());
        document.getElementById('close-day-plan').addEventListener('click', () => this.elements.dayPlanModal.style.display = 'none');
    },

    findAndDisplayPlaces: async function(params, category, label) {
        this.updateStatus('Searching nearby...');
        try {
            const results = await ApiService.nearbySearch({
                location: AppState.currentUserLocation,
                radius: 5000,
                ...params
            });
            AppState.currentResults = results.filter(p => p.business_status === 'OPERATIONAL');
            if (AppState.currentResults.length > 0) this.showNextSuggestion();
            else this.updateStatus('No results found. Try another category!');
        } catch (error) {
            this.updateStatus('Could not complete search.');
        }
    },

    showNextSuggestion: async function() {
        if (AppState.currentResults.length === 0) {
            this.updateStatus('No more suggestions!');
            this.elements.resultScreen.style.display = 'none';
            return;
        }
        const placeSummary = AppState.currentResults.shift();
        try {
            const placeDetails = await ApiService.getPlaceDetails(placeSummary.place_id);
            AppState.currentPlace = placeDetails;
            this.renderPlaceCard(placeDetails);
        } catch (error) {
            this.showNextSuggestion();
        }
    },

    renderPlaceCard: function(place) {
        this.elements.placeName.textContent = place.name;
        this.updateSaveButton();
        this.elements.resultScreen.style.display = 'flex';
        GestureManager.init(this.elements.resultCard);
    },

    toggleSaveCurrentPlace: function() {
        AppState.toggleSavedPlace(AppState.currentPlace);
        this.updateSaveButton();
    },

    updateSaveButton: function() {
        const saveButton = document.getElementById('save-place-button').querySelector('.btn-label');
        const isSaved = !!AppState.savedPlaces[AppState.currentPlace.place_id];
        saveButton.textContent = isSaved ? '★ Saved' : '☆ Save';
    },

    updateStatus: function(text) {
        this.elements.locationStatus.textContent = text;
    },
    
    // --- Compass Logic ---
    openCompass: function() {
        if (!AppState.currentPlace) return;
        this.elements.compassModal.style.display = 'flex';
        // This is a simplified compass loop for demonstration
        this.compassInterval = setInterval(() => {
            // In a real app, you would get heading from device orientation
            // and location from a geolocation watch.
            // For now, we simulate getting closer.
            const dist = Math.random() * 100; // Simulate distance
            this.elements.compassDist.textContent = `${dist.toFixed(0)}m`;
            if (dist < 20) {
                AppState.grantAchievement('EXPLORER_BADGE');
                this.showNotification('🏆 Achievement Unlocked: Explorer!');
                this.closeCompass();
            }
        }, 1000);
    },
    
    closeCompass: function() {
        clearInterval(this.compassInterval);
        this.elements.compassModal.style.display = 'none';
    },
    
    // --- Day Planner Logic ---
    showDayPlan: function() {
        this.elements.dayPlanList.innerHTML = ''; // Clear previous list
        if (AppState.dayPlan.length === 0) {
            this.elements.dayPlanList.innerHTML = `<p class="text-center text-secondary">Your plan is empty. Swipe right on a place to add it!</p>`;
        } else {
            AppState.dayPlan.forEach(place => {
                const item = document.createElement('div');
                item.className = 'p-2 rounded bg-navy-light';
                item.textContent = place.name;
                this.elements.dayPlanList.appendChild(item);
            });
        }
        this.elements.dayPlanModal.style.display = 'flex';
    },

    // --- Notification Logic ---
    showNotification: function(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-5 left-1/2 -translate-x-1/2 bg-accent-gold text-navy-darkest font-bold p-3 rounded-lg shadow-lg z-50';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    init: function() {
        this.cacheElements();
        this.initEventListeners();
    }
};
