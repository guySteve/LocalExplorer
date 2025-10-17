/* js/ui.js */
const UI = {
  elements: {},
  init() { this.cacheElements(); this.initEventListeners(); },

  cacheElements() {
    this.elements = {
      locationStatus: document.getElementById('location-status'),
      manualEntry: document.getElementById('manual-location-entry'),
      locationInput: document.getElementById('location-input'),
      searchButton: document.getElementById('search-button'),
      filterContainer: document.getElementById('filter-container'),
      subMenuContainer: document.getElementById('sub-menu-container'),
      backButton: document.getElementById('back-to-main-filters'),
      randomButton: document.getElementById('random-button'),
      darkSideButton: document.getElementById('dark-side-button'),
      resultsListScreen: document.getElementById('results-list-screen'),
      resultsList: document.getElementById('results-list'),
      closeResultsButton: document.getElementById('close-results-button'),
      resultScreen: document.getElementById('result-screen'),
      resultCard: document.getElementById('result-card'),
      placePhoto: document.getElementById('place-photo'),
      placeName: document.getElementById('place-name'),
      savePlaceButton: document.getElementById('save-place-button'),
      placeStars: document.getElementById('place-stars'),
      placeRating: document.getElementById('place-rating'),
      placePrice: document.getElementById('place-price'),
      phoneLink: document.getElementById('phone-link'),
      placeTypesContainer: document.getElementById('place-types-container'),
      directionsLink: document.getElementById('directions-link'),
      websiteLink: document.getElementById('website-link'),
      reviewsButton: document.getElementById('reviews-button'),
      backToResultsButton: document.getElementById('back-to-results-button'),
      reviewsModal: document.getElementById('reviews-modal'),
      reviewsList: document.getElementById('reviews-list'),
      closeReviews: document.getElementById('close-reviews'),
      savedModal: document.getElementById('saved-modal'),
      savedList: document.getElementById('saved-list'),
      openSavedButton: document.getElementById('open-saved-button'),
      closeSaved: document.getElementById('close-saved'),
    };
  },

  initEventListeners() {
    this.elements.filterContainer.addEventListener('click', e => {
      const btn = e.target.closest('button[data-filter]');
      if (btn) this.showSubMenu(btn.dataset.filter);
    });

    this.elements.subMenuContainer.addEventListener('click', e => {
      const btn = e.target.closest('button[data-parent]');
      if (btn) {
        const parent = btn.dataset.parent;
        const name = btn.dataset.name;
        const params = AppState.subFilterMap[parent][name];
        this.findAndDisplayPlaces(params);
      }
    });

    this.elements.backButton.addEventListener('click', () => this.hideSubMenu());
    this.elements.randomButton.addEventListener('click', () => this.findRandomAdventure());
    this.elements.darkSideButton.addEventListener('click', () => this.showSubMenu('dark'));
    this.elements.closeResultsButton.addEventListener('click', () => this.elements.resultsListScreen.classList.add('hidden'));

    this.elements.resultsList.addEventListener('click', e => {
      const btn = e.target.closest('button[data-place-id]');
      if (btn) this.showPlaceDetails(btn.dataset.placeId);
    });

    this.elements.backToResultsButton.addEventListener('click', () => {
      this.elements.resultScreen.classList.add('hidden');
      this.elements.resultsListScreen.classList.remove('hidden');
    });

    this.elements.reviewsButton.addEventListener('click', () => this.renderReviews());
    this.elements.closeReviews.addEventListener('click', () => this.elements.reviewsModal.classList.add('hidden'));
    this.elements.savePlaceButton.addEventListener('click', () => this.toggleSaveCurrentPlace());
    this.elements.openSavedButton.addEventListener('click', () => this.renderSavedPlaces());
    this.elements.closeSaved.addEventListener('click', () => this.elements.savedModal.classList.add('hidden'));

    // Manual search
    this.elements.searchButton.addEventListener('click', () => Main.geocodeAddress());
    this.elements.locationInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Main.geocodeAddress();
    });
  },

  async findAndDisplayPlaces(params) {
    if (!AppState.currentUserLocation) {
      this.updateStatus('Enter a city first.');
      this.elements.manualEntry.classList.remove('hidden');
      return;
    }
    this.hideSubMenu();
    this.updateStatus('Searching...');
    try {
      const results = await ApiService.nearbySearch({ location: AppState.currentUserLocation, radius: 15000, ...params });
      AppState.currentResults = results.filter(p => p.business_status === 'OPERATIONAL' && p.rating);
      if (AppState.currentResults.length > 0) {
        this.renderResultsList(AppState.currentResults);
        this.updateStatus('');
      } else {
        this.updateStatus('No results found.');
      }
    } catch {
      this.updateStatus('Search failed.');
    }
  },

  renderResultsList(results) {
    this.elements.resultsList.innerHTML = results.map(p => `
      <button class="action-card w-full text-left p-2 flex gap-3 items-center" data-place-id="${p.place_id}">
        <img class="w-16 h-16 rounded-md object-cover bg-navy-light" src="${p.photos ? p.photos[0].getUrl({maxWidth:200}) : ''}" alt="">
        <div><h3>${p.name}</h3><p class="text-sm" style="color:var(--accent-gold)">★ ${p.rating ?? 'N/A'}</p></div>
      </button>
    `).join('');
    this.elements.resultsListScreen.classList.remove('hidden');
  },

  async showPlaceDetails(placeId) {
    this.updateStatus('Loading details...');
    try {
      const place = await ApiService.getPlaceDetails(placeId);
      AppState.currentPlace = place;
      this.renderDetailedCard(place);
      this.elements.resultsListScreen.classList.add('hidden');
      this.elements.resultScreen.classList.remove('hidden');
      this.updateStatus('');
    } catch {
      this.updateStatus('Could not load details.');
    }
  },

  renderDetailedCard(p) {
    this.elements.placePhoto.src = p.photos ? p.photos[0].getUrl({ maxWidth: 800 }) : '';
    this.elements.placeName.textContent = p.name;
    this.updateSaveButton();
    this.elements.placeStars.innerHTML = this.renderStarsHTML(p.rating);
    this.elements.placeRating.textContent = `${(p.rating ?? 0).toFixed(1)} (${p.user_ratings_total || 0})`;
    this.elements.placePrice.textContent = p.price_level ? "$".repeat(p.price_level) : '';
    this.elements.phoneLink.textContent = p.formatted_phone_number || '';
    this.elements.phoneLink.href = p.formatted_phone_number ? `tel:${p.formatted_phone_number}` : '#';
    this.elements.placeTypesContainer.innerHTML = (p.types || []).slice(0, 3).map(t => `<span class="place-type-tag">${t.replace(/_/g, ' ')}</span>`).join('');
    const dest = p.vicinity || (p.geometry?.location ? `${p.geometry.location.lat()},${p.geometry.location.lng()}` : p.name);
    this.elements.directionsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&destination_place_id=${p.place_id}`;
    this.elements.websiteLink.href = p.website || '#';
    this.elements.websiteLink.classList.toggle('hidden', !p.website);
  },

  renderReviews() {
    const reviews = AppState.currentPlace?.reviews || [];
    this.elements.reviewsList.innerHTML = reviews.length ? reviews.map(r => `
      <div class="review">
        <p class="font-bold">${r.author_name} - ${this.renderStarsHTML(r.rating)}</p>
        <p class="text-sm">${r.relative_time_description}</p>
        <p class="mt-2">${r.text}</p>
      </div>
    `).join('') : '<p>No reviews found.</p>';
    this.elements.reviewsModal.classList.remove('hidden');
  },

  renderSavedPlaces() {
    const entries = Object.entries(AppState.savedPlaces);
    this.elements.savedList.innerHTML = entries.length ? entries.map(([id, p]) => `
      <div class="saved-item">
        <p class="font-bold">${p.name}</p>
        <p class="text-sm">${p.vicinity || ''}</p>
      </div>
    `).join('') : '<p>No saved places yet.</p>';
    this.elements.savedModal.classList.remove('hidden');
  },

  toggleSaveCurrentPlace() { AppState.toggleSavedPlace(AppState.currentPlace); this.updateSaveButton(); },
  updateSaveButton() { this.elements.savePlaceButton.textContent = AppState.savedPlaces[AppState.currentPlace?.place_id] ? '★' : '☆'; },
  renderStarsHTML(rating) { let h = ''; const r = Math.round(rating || 0); for (let i = 1; i <= 5; i++) h += `<span class="star ${i <= r ? 'filled' : ''}">★</span>`; return h; },

  showSubMenu(filter) {
    const map = AppState.subFilterMap[filter];
    if (!map) return;
    const buttons = Object.keys(map).map(name =>
      `<button class="action-card w-full" data-parent="${filter}" data-name="${name}">${name}</button>`
    ).join('');
    this.elements.subMenuContainer.innerHTML = `<div class="grid grid-cols-2 gap-3">${buttons}</div>`;
    this.elements.subMenuContainer.classList.remove('hidden');
    this.elements.backButton.classList.remove('hidden');
    this.elements.filterContainer.classList.add('hidden');
  },

  hideSubMenu() {
    this.elements.subMenuContainer.classList.add('hidden');
    this.elements.backButton.classList.add('hidden');
    this.elements.filterContainer.classList.remove('hidden');
  },

  async findRandomAdventure() {
    // Pick a random top-level category then random sub-option
    const topKeys = ["eat","see","night","gems","pets"];
    const parent = topKeys[Math.floor(Math.random() * topKeys.length)];
    const subKeys = Object.keys(AppState.subFilterMap[parent]);
    const name = subKeys[Math.floor(Math.random() * subKeys.length)];
    const params = AppState.subFilterMap[parent][name];
    this.updateStatus('Spinning the wheel…');
    await this.findAndDisplayPlaces(params);
  },

  updateStatus(text) { this.elements.locationStatus.textContent = text || ''; },

  showNotification(text) {
    // Minimal toast
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'fixed';
    el.style.bottom = '16px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.background = 'rgba(0,0,0,.7)';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
};
