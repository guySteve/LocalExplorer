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
            dayPlanModal: document.getElementById('day-plan-modal'),
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

        // Other main menu buttons
        this.elements.backButton.addEventListener('click', () => this.hideSubMenu());
        this.elements.randomButton.addEventListener('click', () => this.findRandomAdventure());
        this.elements.darkSideButton.addEventListener('click', () => this.showSubMenu('dark'));
        document.getElementById('open-day-plan-button').addEventListener('click', () => {/* Placeholder */});
    },

    // --- Restored Menu Logic ---
    showSubMenu: function(filter) {
        this.elements.filterContainer.classList.add('hidden');
        this.elements.randomButton.classList.add('hidden');
        this.elements.darkSideButton.style.display = 'none';

        const subCategories = AppState.subFilterMap[filter];
        this.elements.subMenuContainer.innerHTML = '';
        
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
        this.elements.darkSideButton.style.display = 'block';
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
        this.hideSubMenu();
        this.updateStatus('Searching...');
        // This function will be expanded in the next step to show a results list
        console.log("Searching with params:", params);
        // Placeholder for results
        this.updateStatus('Search complete. Feature under construction.');
    },
    
    updateStatus: function(text) {
        this.elements.locationStatus.textContent = text;
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
