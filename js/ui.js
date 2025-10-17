const UI = {
    elements: {},
    compassInterval: null,

    cacheElements: function() {
        this.elements = {
            locationStatus: document.getElementById('location-status'),
            funFactText: document.getElementById('fun-fact-text'),
            filterContainer: document.getElementById('filter-container'),
            resultScreen: document.getElementById('result-screen'),
            resultCard: document.getElementById('result-card'),
            placeName: document.getElementById('place-name'),
            compassModal: document.getElementById('compass-modal'),
            compassDist: document.getElementById('compass-dist'),
            compassArrow: document.getElementById('compass-arrow'),
            dayPlanModal: document.getElementById('day-plan-modal'),
            dayPlanList: document.getElementById('day-plan-list'),
        };
    },
    initEventListeners: function() {
        this.elements.filterContainer.addEventListener('click', e => {
            const btn = e.target.closest('button[data-filter]');
            if (btn) this.findAndDisplayPlaces(JSON.parse(btn.dataset.filter));
        });
        this.elements.resultCard.addEventListener('click', e => {
            if (e.target.closest('#compass-button')) this.openCompass();
            if (e.target.closest('#save-place-button')) this.toggleSaveCurrentPlace();
        });
        document.getElementById('close-compass').addEventListener('click', () => this.closeCompass());
        document.getElementById('open-day-plan-button').addEventListener('click', () => this.showDayPlan());
        document.getElementById('close-day-plan').addEventListener('click', () => this.elements.dayPlanModal.style.display = 'none');
    },
    findAndDisplayPlaces: async function(params) {
        this.updateStatus('Searching...');
        try {
            const results = await ApiService.nearbySearch({ location: AppState.currentUserLocation, radius: 5000, ...params });
            AppState.currentResults = results.filter(p => p.photos && p.rating);
            if (AppState.currentResults.length > 0) this.showNextSuggestion();
            else this.updateStatus('No results found.');
        } catch {
            this.updateStatus('Search failed.');
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
        } catch {
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
        const btn = this.elements.resultCard.querySelector('#save-place-button');
        const isSaved = !!AppState.savedPlaces[AppState.currentPlace.place_id];
        btn.textContent = isSaved ? '★ Saved' : '☆ Save';
    },
    updateStatus: function(text) {
        this.elements.locationStatus.textContent = text;
    },
    openCompass: function() {
        this.elements.compassModal.style.display = 'flex';
        // Simplified compass for demonstration
        this.compassInterval = setInterval(() => {
            const dist = Math.random() * 100;
            this.elements.compassDist.textContent = `${dist.toFixed(0)}m`;
            if (dist < 20) {
                AppState.grantAchievement('Explorer');
                this.closeCompass();
            }
        }, 1000);
    },
    closeCompass: function() {
        clearInterval(this.compassInterval);
        this.elements.compassModal.style.display = 'none';
    },
    showDayPlan: function() {
        this.elements.dayPlanList.innerHTML = AppState.dayPlan.length === 0
            ? `<p class="text-center text-secondary">Plan is empty.</p>`
            : AppState.dayPlan.map(p => `<div class="p-2 rounded" style="background:var(--navy-light)">${p.name}</div>`).join('');
        this.elements.dayPlanModal.style.display = 'flex';
    },
    showNotification: function(message) {
        const el = document.createElement('div');
        el.className = 'fixed top-5 left-1/2 -translate-x-1/2 font-bold p-3 rounded-lg shadow-lg z-50';
        el.style.background = 'var(--accent-gold)';
        el.style.color = 'var(--navy-darkest)';
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    },
    init: function() {
        this.cacheElements();
        this.initEventListeners();
    }
};
