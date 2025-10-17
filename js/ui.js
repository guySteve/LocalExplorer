const UI = {
    elements: {},
    compassInterval: null,

    cacheElements: function() {
        this.elements = {
            // ... (other elements remain)
            filterContainer: document.getElementById('filter-container'),
            subMenuContainer: document.getElementById('sub-menu-container'),
            backButton: document.getElementById('back-to-main-filters'),
            randomButton: document.getElementById('random-button'),
            darkSideButton: document.getElementById('dark-side-button'),
            
            // (NEW) Results List Elements
            resultsListScreen: document.getElementById('results-list-screen'),
            resultsTitle: document.getElementById('results-title'),
            resultsList: document.getElementById('results-list'),
            closeResultsButton: document.getElementById('close-results-button'),

            // (For next step)
            resultScreen: document.getElementById('result-screen'),
        };
    },

    initEventListeners: function() {
        // ... (main menu, sub-menu, random, and dark-side listeners remain the same)
        this.elements.filterContainer.addEventListener('click', e => { /* ... */ });
        this.elements.subMenuContainer.addEventListener('click', e => { /* ... */ });
        this.elements.backButton.addEventListener('click', () => this.hideSubMenu());
        this.elements.randomButton.addEventListener('click', () => this.findRandomAdventure());
        this.elements.darkSideButton.addEventListener('click', () => this.showSubMenu('dark'));

        // (NEW) Listener for closing the results list
        this.elements.closeResultsButton.addEventListener('click', () => {
            this.elements.resultsListScreen.classList.add('hidden');
        });

        // (NEW) Listener for clicks on individual result items
        this.elements.resultsList.addEventListener('click', e => {
            const resultItem = e.target.closest('button[data-place-id]');
            if (resultItem) {
                const placeId = resultItem.dataset.placeId;
                // Find the place data from our last search
                const place = AppState.currentResults.find(p => p.place_id === placeId);
                if (place) {
                    console.log("Show details for:", place.name);
                    // In the next step, this will open the detailed card view
                    // For now, it just logs to the console.
                }
            }
        });
    },

    // --- UPDATED Search and Render Logic ---
    findAndDisplayPlaces: async function(params) {
        this.hideSubMenu();
        this.updateStatus('Searching...');
        try {
            const results = await ApiService.nearbySearch({
                location: AppState.currentUserLocation,
                radius: 5000,
                ...params
            });
            
            // Store results and filter out places without key info
            AppState.currentResults = results.filter(p => p.business_status === 'OPERATIONAL' && p.photos && p.rating);
            
            if (AppState.currentResults.length > 0) {
                this.renderResultsList(AppState.currentResults);
                this.updateStatus(''); // Clear "Searching..." message
            } else {
                this.updateStatus('No results found. Try another category!');
            }
        } catch (error) {
            this.updateStatus('Search failed. Please check your connection.');
        }
    },

    renderResultsList: function(results) {
        this.elements.resultsList.innerHTML = ''; // Clear previous results
        results.forEach(place => {
            const photoUrl = place.photos[0].getUrl({ maxWidth: 200, maxHeight: 200 });
            const rating = place.rating.toFixed(1);
            const totalRatings = place.user_ratings_total;
            
            const card = document.createElement('button');
            card.className = 'action-card w-full text-left p-2 flex gap-3 items-center';
            card.dataset.placeId = place.place_id;
            
            card.innerHTML = `
                <img class="w-16 h-16 rounded-md object-cover" src="${photoUrl}" alt="${place.name}" />
                <div class="flex-1">
                    <h3 class="font-bold">${place.name}</h3>
                    <p class="text-sm" style="color:var(--accent-gold)">${'★'.repeat(Math.round(place.rating))} <span class="font-sans font-normal" style="color:var(--text-secondary)">(${rating} / ${totalRatings} reviews)</span></p>
                </div>
            `;
            this.elements.resultsList.appendChild(card);
        });
        this.elements.resultsListScreen.classList.remove('hidden');
    },

    // ... (other functions like showSubMenu, hideSubMenu, findRandomAdventure remain the same)
    showSubMenu: function(filter) { /* ... */ },
    hideSubMenu: function() { /* ... */ },
    findRandomAdventure: function() { /* ... */ },
    updateStatus: function(text) { /* ... */ },
    showNotification: function(message) { /* ... */ },
    init: function() { this.cacheElements(); this.initEventListeners(); }
};
