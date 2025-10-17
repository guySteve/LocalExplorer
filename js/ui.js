const UI = {
    elements: {},
    compassInterval: null,

    cacheElements: function() {
        this.elements = {
            locationStatus: document.getElementById('location-status'),
            funFactText: document.getElementById('fun-fact-text'),
            filterContainer: document.getElementById('filter-container'),
            subMenuContainer: document.getElementById('sub-menu-container'),
            backButton: document.getElementById('back-to-main-filters'),
            randomButton: document.getElementById('random-button'),
            darkSideButton: document.getElementById('dark-side-button'),
            resultScreen: document.getElementById('result-screen'),
            resultCard: document.getElementById('result-card'),
            placeName: document.getElementById('place-name'),
            dayPlanModal: document.getElementById('day-plan-modal'),
            dayPlanList: document.getElementById('day-plan-list'),
        };
    },

    initEventListeners: function() {
        // Main category clicks show the sub-menu
        this.elements.filterContainer.addEventListener('click', e => {
            const btn = e.target.closest('button[data-filter]');
            if (btn) this.showSubMenu(btn.dataset.filter);
        });

        // Sub-menu clicks perform the search
        this.elements.subMenuContainer.addEventListener('click', e => {
            const btn = e.target.closest('button[data-parent]');
            if (btn) {
                const parent = btn.dataset.parent;
                const name = btn.dataset.name;
                const params = AppState.subFilterMap[parent][name];
                this.findAndDisplayPlaces(params);
            }
        });

        // Other buttons
        this.elements.backButton.addEventListener('click', () => this.hideSubMenu());
        this.elements.randomButton.addEventListener('click', () => this.findRandomAdventure());
        this.elements.darkSideButton.addEventListener('click', () => this.showSubMenu('dark'));

        // Event listeners for result card, compass, etc. remain
        this.elements.resultCard.addEventListener('click', e => { /*...*/ });
        document.getElementById('close-compass').addEventListener('click', () => this.closeCompass());
        document.getElementById('open-day-plan-button').addEventListener('click', () => this.showDayPlan());
        document.getElementById('close-day-plan').addEventListener('click', () => this.elements.dayPlanModal.style.display = 'none');
    },

    // --- Restored Menu Logic ---
    showSubMenu: function(filter) {
        this.elements.filterContainer.classList.add('hidden');
        this.elements.randomButton.classList.add('hidden');

        const subCategories = AppState.subFilterMap[filter];
        this.elements.subMenuContainer.innerHTML = ''; // Clear previous
        
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-3';

        for (const name in subCategories) {
            const button = document.createElement('button');
            button.className = 'action-card';
            button.textContent = name;
            button.dataset.name = name;
            button.dataset.parent = filter;
            grid.appendChild(button);
        }
        this.elements.subMenuContainer.appendChild(grid);
        this.elements.subMenuContainer.classList.remove('hidden');
        this.elements.backButton.classList.remove('hidden');
    },

    hideSubMenu: function() {
        this.elements.subMenuContainer.classList.add('hidden');
        this.elements.backButton.classList.add('hidden');
        this.elements.filterContainer.classList.remove('hidden');
        this.elements.randomButton.classList.remove('hidden');
    },

    findRandomAdventure: function() {
        const categories = { ...AppState.subFilterMap };
        delete categories.utilities;
        delete categories.pets;
        delete categories.dark;

        const allOptions = Object.values(categories).flatMap(obj => Object.values(obj));
        const randomChoice = allOptions[Math.floor(Math.random() * allOptions.length)];
        this.findAndDisplayPlaces(randomChoice);
    },
    // --- End of Restored Menu Logic ---

    findAndDisplayPlaces: async function(params) {
        this.hideSubMenu(); // Hide menus when search starts
        this.updateStatus('Searching...');
        // ... (rest of the function is the same)
    },
    
    // ... (rest of the functions in this file remain the same) ...
    showNextSuggestion: async function() { /*...*/ },
    renderPlaceCard: function(place) { /*...*/ },
    toggleSaveCurrentPlace: function() { /*...*/ },
    updateSaveButton: function() { /*...*/ },
    updateStatus: function(text) { /*...*/ },
    openCompass: function() { /*...*/ },
    closeCompass: function() { /*...*/ },
    showDayPlan: function() { /*...*/ },
    showNotification: function(message) { /*...*/ },
    init: function() { /*...*/ }
};
