function $(id) { return document.getElementById(id); }

const weatherElements = {
  widget: $("weatherWidget"),
  title: $("weatherTitle"),
  updated: $("weatherUpdated"),
  icon: $("weatherIcon"),
  temp: $("weatherTemp"),
  description: $("weatherDescription"),
  feels: $("weatherFeels"),
  wind: $("weatherWind"),
  range: $("weatherRange")
};
const voiceSelect = $("voiceSelect");
const compassLabels = {
  location: $("compassLocationLabel"),
  destination: $("compassDestinationLabel"),
  heading: $("compassHeadingValue")
};

function sampleFromArray(list, count = 5) {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, count);
    }

function stripHtml(text) { return (text || '').replace(/<[^>]+>/g, '').trim(); }

function toPlainLatLng(latLng) {
      if (!latLng) return null;
      if (typeof latLng.lat === 'function' && typeof latLng.lng === 'function') {
        return { lat: latLng.lat(), lng: latLng.lng() };
      }
      if (typeof latLng.lat === 'number' && typeof latLng.lng === 'number') return latLng;
      return null;
    }

function closeOverlayElement(el) {
      if (!el) return;
      el.classList.remove('active');
      const otherModalsOpen = document.querySelector('.modal.active');
      const detailsOpen = $("detailsSheet")?.classList.contains('active');
      const compassOpen = $("compassOverlay")?.classList.contains('active');
      if (!otherModalsOpen && !detailsOpen && !compassOpen) {
        document.body.classList.remove('modal-open');
      }
    }

function enableSwipeDismiss({ container, dragTarget, scrollElement, onDismiss, threshold = 90, maxOffset = 220 }) {
      if (!container || !dragTarget || typeof onDismiss !== 'function') return;
      const scrollRef = scrollElement || dragTarget;
      let startY = 0;
      let currentOffset = 0;
      let dragging = false;

      const setOffset = (value) => dragTarget.style.setProperty('--swipe-offset', `${Math.max(0, value)}px`);
      const clearOffset = () => {
        dragTarget.style.transition = 'transform 0.18s ease';
        setOffset(0);
        requestAnimationFrame(() => {
          dragTarget.style.transition = '';
          dragTarget.style.removeProperty('--swipe-offset');
        });
      };

      const handleStart = (evt) => {
        if (!container.classList.contains('active')) return;
        if (evt.touches.length !== 1) return;
        if (scrollRef && scrollRef.scrollTop > 2) {
          dragging = false;
          return;
        }
        dragging = true;
        startY = evt.touches[0].clientY;
        currentOffset = 0;
        dragTarget.style.transition = '';
      };

      const handleMove = (evt) => {
        if (!dragging) return;
        const deltaY = evt.touches[0].clientY - startY;
        if (deltaY <= 0) {
          setOffset(0);
          return;
        }
        evt.preventDefault();
        currentOffset = Math.min(deltaY, maxOffset);
        setOffset(currentOffset);
      };

      const handleEnd = () => {
        if (!dragging) return;
        dragging = false;
        if (currentOffset > threshold) {
          setOffset(0);
          dragTarget.style.removeProperty('--swipe-offset');
          onDismiss();
        } else {
          clearOffset();
        }
        currentOffset = 0;
      };

      dragTarget.addEventListener('touchstart', handleStart, { passive: true });
      dragTarget.addEventListener('touchmove', handleMove, { passive: false });
      dragTarget.addEventListener('touchend', handleEnd, { passive: true });
      dragTarget.addEventListener('touchcancel', () => { dragging = false; clearOffset(); }, { passive: true });
    }

function attachModalSwipe(modalEl, closeHandler) {
      if (!modalEl || typeof closeHandler !== 'function') return;
      const content = modalEl.querySelector('.modal-content');
      if (!content) return;
      enableSwipeDismiss({ container: modalEl, dragTarget: content, scrollElement: content, onDismiss: closeHandler });
    }

function applyThemeVariables(themeKey) { /* Applies CSS variables from THEMES */
      const theme = THEMES[themeKey] || THEMES[DEFAULT_THEME];
      if (!theme) return;
      const root = document.documentElement;
      Object.entries(theme).forEach(([token, value]) => root.style.setProperty(token, value));
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) themeColorMeta.content = theme['--background'] || '#f8f7f2';
      if (document.body) {
        document.body.classList.toggle('theme-retro90', themeKey === 'retro90');
        document.body.classList.toggle('theme-groove70', themeKey === 'groove70');
        if (themeKey !== 'retro90' && themeKey !== 'groove70') {
          document.body.classList.remove('theme-retro90', 'theme-groove70');
        }
      }
      currentThemeKey = themeKey;
    }

function setTheme(themeKey, persist = true) { /* Sets theme and saves preference */
      applyThemeVariables(themeKey);
      if (persist) localStorage.setItem('selectedTheme', themeKey);
    }

function populateVoices() { /* Populates voice dropdown in settings */
      const voices = window.speechSynthesis.getVoices();
      if (!voiceSelect || !voices || voices.length === 0) return;
      voiceSelect.innerHTML = ''; // Clear existing options
      voices.forEach(voice => {
        const opt = document.createElement('option');
        opt.value = voice.voiceURI;
        opt.textContent = `${voice.name}${voice.lang ? ' (' + voice.lang + ')' : ''}`;
        voiceSelect.appendChild(opt);
      });
      const match = voices.find(v => v.voiceURI === selectedVoiceUri);
      if (match) voiceSelect.value = selectedVoiceUri;
      else if (voices[0]) { // Default to first available voice
        selectedVoiceUri = voices[0].voiceURI;
        voiceSelect.value = selectedVoiceUri;
        localStorage.setItem('selectedVoiceUri', selectedVoiceUri);
      }
    }

function populateFilterButtons() { /* Create main category buttons */
      const grid = $("filterGrid"); grid.innerHTML = '';
      Object.keys(categories).forEach(cat => {
        const btn = document.createElement('button'); btn.className = 'filter-btn';
        btn.innerHTML = `<span class="emoji">${getIconForCategory(cat)}</span>${cat}`;
        btn.onclick = () => openSubMenu(cat); grid.appendChild(btn);
      });
    }

function getIconForCategory(cat) { /* Get emoji for category */
      switch (cat) {
        case 'Foodie Finds': return '🍽️'; case 'Iconic Sights': return '🏛️'; case 'Night Out': return '🌙';
        case 'Hidden Gems': return '💎'; case 'Pet Friendly': return '🐾'; case 'Utilities & Help': return '🛠️';
        case 'Outdoor': return '🌲'; case 'Local Events': return '🎟️'; default: return '';
      }
    }

function openSubMenu(categoryName) { /* Open sub-category modal */
      $("subMenuTitle").textContent = categoryName; const list = $("subMenuList"); list.innerHTML = '';
      categories[categoryName].forEach(item => {
        const btn = document.createElement('button'); btn.textContent = item.name;
        btn.onclick = () => { closeSubMenu(); performSearch(categoryName, item); }; list.appendChild(btn);
      });
      $("subMenuModal").classList.add('active'); document.body.classList.add('modal-open');
    }

function closeSubMenu() { closeOverlayElement($("subMenuModal")); }

function displayEventResults(events, subCategory) { /* Display Ticketmaster results */
        const list = $("resultsList"); list.innerHTML = '';
        $("resultsTitle").textContent = `${subCategory} Events`;
        setLoadMoreState(null);
        if (events.length === 0) { list.innerHTML = '<p style="text-align:center; color: var(--card);">No events found nearby.</p>'; }
        events.forEach(event => {
            const btn = document.createElement('button'); btn.onclick = () => { if (event.url) window.open(event.url, '_blank'); };
            const wrap = document.createElement('div'); wrap.className = 'results-item';
            // Image (still show event images)
            const img = document.createElement('img');
            img.src = (event.images && event.images.length > 0) ? event.images[0].url : 'data:image/png;base64,...'; // Placeholder needed
            img.style.width = '60px'; img.style.height = '60px'; img.style.objectFit = 'cover'; img.style.borderRadius = 'var(--radius)'; img.style.flexShrink = '0';
            wrap.appendChild(img);
            // Info
            const info = document.createElement('div'); info.className = 'results-info';
            const title = document.createElement('h4'); title.textContent = event.name; info.appendChild(title);
            // Add Date/Time
            if (event.dates && event.dates.start) { const d = event.dates.start.localDate || '', t = event.dates.start.localTime || ''; const span = document.createElement('span'); span.className = 'rating'; span.textContent = d + (t ? ` ${t}` : ''); info.appendChild(span); }
            // Add Venue
            if (event._embedded?.venues?.[0]) { const v = event._embedded.venues[0]; const city = v.city?.name || ''; const state = v.state?.name || v.state?.stateCode || ''; const loc = city && state ? `${city}, ${state}` : city || state; const span = document.createElement('span'); span.className = 'rating'; span.textContent = v.name + (loc ? ` — ${loc}` : ''); info.appendChild(span); }
            wrap.appendChild(info); btn.appendChild(wrap); list.appendChild(btn);
        });
        $("resultsModal").classList.add('active'); document.body.classList.add('modal-open');
    }

function displayResults(title, results, opts = {}) { /* Display Google Places results (text-only) */
      const { append = false } = opts;
      const list = $("resultsList");
      if (!append) {
        $("resultsTitle").textContent = `${title} Results`;
        list.innerHTML = '';
      }
      const planIds = getPlan().map(p => p.place_id), visitedIds = getVisitedPlan();
      if (!append && results.length === 0) {
        list.innerHTML = '<p style="text-align:center; color: var(--card);">No results found.</p>';
        setLoadMoreState(null);
      }
      results.forEach(place => {
        const btn = document.createElement('button'); btn.onclick = () => showDetails(place.place_id);
        const wrap = document.createElement('div'); wrap.className = 'results-item';
        const info = document.createElement('div'); info.className = 'results-info';
        const titleEl = document.createElement('h4'); titleEl.textContent = place.name; info.appendChild(titleEl);
        const rating = document.createElement('span'); rating.className = 'rating';
        rating.textContent = place.rating ? `⭐${place.rating.toFixed(1)} (${place.user_ratings_total || 0})` : 'No rating'; info.appendChild(rating);
        if (planIds.includes(place.place_id)) {
          const visit = document.createElement('span'); visit.className = 'rating'; visit.style.marginLeft = '0.3rem';
          visit.textContent = visitedIds.includes(place.place_id) ? '✅' : '🧭'; info.appendChild(visit);
        }
        wrap.appendChild(info); btn.appendChild(wrap); list.appendChild(btn);
      });
      $("resultsModal").classList.add('active'); document.body.classList.add('modal-open');
    }

function setLoadMoreState(pagination) {
      currentPaginationHandle = (pagination && pagination.hasNextPage) ? pagination : null;
      const btn = $("loadMoreResultsBtn");
      if (!btn) return;
      if (currentPaginationHandle) {
        btn.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Keep scanning';
      } else {
        btn.style.display = 'none';
      }
    }

function closeResultsModal() { closeOverlayElement($("resultsModal")); }

function closeDetails() {
      prepareStreetViewPreview(null);
      closeOverlayElement($("detailsSheet"));
    }

function populateReviews(reviews) { /* Fill reviews accordion */
      const content = $("reviewsContent"); content.innerHTML = '';
      if (!reviews || reviews.length === 0) content.innerHTML = '<p>No reviews available.</p>';
      else reviews.slice(0, 5).forEach(r => { 
          const item = document.createElement('div');
          item.className = 'review-item';
          const author = document.createElement('strong');
          author.textContent = r.author_name;
          const text = document.createElement('blockquote');
          text.textContent = `"${r.text}"`;
          item.appendChild(author);
          item.appendChild(text);
          content.appendChild(item);
      });
    }

function populateHours(hours) { /* Fill hours accordion */
      const content = $("hoursContent"); content.innerHTML = '';
      if (!hours?.weekday_text) content.innerHTML = '<p>No hours available.</p>';
      else hours.weekday_text.forEach(l => { const p = document.createElement('p'); p.textContent = l; content.appendChild(p); });
    }

function setupAccordions() { /* Add click listeners to accordions */
      document.querySelectorAll('.accordion').forEach(btn => {
        btn.onclick = () => {
          btn.classList.toggle('active'); const content = btn.nextElementSibling;
          content.style.maxHeight = btn.classList.contains('active') ? content.scrollHeight + 'px' : null;
        };
      });
    }

function updateSaveButtonState(id) { const saved = getSavedList().some(p => p.place_id === id); $("saveBtn").textContent = saved ? '★ Saved' : '☆ Save'; $("saveBtn").onclick = () => { saved ? removePlace(id) : savePlace(currentPlaceDetails); updateSaveButtonState(id); loadMyList(); }; }

function updatePlanButtonState(id) { const inPlan = getPlan().some(p => p.place_id === id); const btn = $("planBtn"); btn.textContent = inPlan ? '🗺️ In Plan' : '🗺️ Add to Plan'; btn.classList.toggle('in-plan', inPlan); btn.onclick = () => { if (!currentPlaceDetails) return; inPlan ? removeFromPlan(id) : addToPlan(currentPlaceDetails); loadPlan(); updatePlanButtonState(id); }; }

function loadPlan() { /* Load and display plan items */
        const list = getPlan(), content = $("planContent"), empty = $("planEmpty"), summary = $("planSummary");
        content.innerHTML = ''; const visited = getVisitedPlan();
        if (!list.length) { empty.style.display = 'block'; summary.textContent = ''; return; }
        empty.style.display = 'none';
        const vCount = list.filter(i => visited.includes(i.place_id)).length, total = list.length;
        const ratio = vCount / total; let badge = ratio === 1 ? '🎖️' : ratio >= 0.8 ? '🥇' : ratio >= 0.5 ? '🥈' : ratio >= 0.3 ? '🥉' : '🔰';
        summary.textContent = `Visited ${vCount} of ${total} places ${badge}`;
        list.forEach(item => { /* Create button for each item */
            const btn = document.createElement('button'); btn.style.display = 'flex'; /* ... styling ... */ btn.style.alignItems = 'center'; btn.style.width = '100%';
            const wrap = document.createElement('div'); wrap.className = 'results-item';
            const info = document.createElement('div'); info.className = 'results-info';
            const title = document.createElement('h4'); title.textContent = item.name; info.appendChild(title);
            const vSpan = document.createElement('span'); vSpan.className = 'rating'; vSpan.textContent = visited.includes(item.place_id) ? 'Visited' : 'Not visited'; info.appendChild(vSpan);
            wrap.appendChild(info); btn.appendChild(wrap);
            // Visible 'Visited' button
            const vBtn = document.createElement('button'); vBtn.textContent = visited.includes(item.place_id) ? '✔️ Visited' : '◻️ Visit';
            vBtn.style.cssText = 'flex-shrink: 0; margin-left: 0.5rem; background: var(--card); color: var(--text-light); border: 1px solid var(--accent); border-radius: 8px; padding: 0.3rem 0.5rem; font-size: 0.8rem; cursor: pointer;';
            vBtn.onclick = (e) => { e.stopPropagation(); toggleVisited(item.place_id); loadPlan(); }; btn.appendChild(vBtn);
            btn.onclick = () => { showDetails(item.place_id); closePlan(); }; content.appendChild(btn);
        });
    }

function closePlan() { closeOverlayElement($("planModal")); }

function sharePlan() {
  const plan = getPlan();
  if (!plan || plan.length === 0) {
    alert('Plan is empty.');
    return;
  }
  try {
    const data = { items: plan };
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    const shareUrl = `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
    if (navigator.share) {
      navigator.share({ title: 'My Local Explorer Plan', text: 'Check out my travel plan!', url: shareUrl }).catch(console.error);
    } else {
      window.prompt('Copy and share this link:', shareUrl);
    }
  } catch (err) {
    console.error('Plan share failed', err);
    alert('Unable to share plan right now.');
  }
}

function loadMyList() { /* Load and display favorites */
        const list = getSavedList(), content = $("myListContent"), empty = $("myListEmpty");
        content.innerHTML = '';
        if (!list.length) { empty.style.display = 'block'; return; }
        empty.style.display = 'none';
        list.forEach(item => {
            const btn = document.createElement('button'); btn.onclick = () => { showDetails(item.place_id); closeMyList(); };
            const wrap = document.createElement('div'); wrap.className = 'results-item';
            const info = document.createElement('div'); info.className = 'results-info';
            const title = document.createElement('h4'); title.textContent = item.name; info.appendChild(title);
            const rating = document.createElement('span'); rating.className = 'rating'; rating.textContent = item.rating ? `★${item.rating.toFixed(1)}` : ''; info.appendChild(rating);
            wrap.appendChild(info); btn.appendChild(wrap);
            const del = document.createElement('span');
            del.className = 'list-remove';
            del.setAttribute('aria-label', `Remove ${item.name} from My List`);
            del.title = 'Remove from My List';
            del.textContent = '✕';
            del.onclick = (e) => { e.stopPropagation(); removePlace(item.place_id); loadMyList(); };
            btn.appendChild(del);
            content.appendChild(btn);
        });
    }

function closeMyList() { closeOverlayElement($("myListModal")); }

function closeDonateModal() { closeOverlayElement($("donateModal")); }

function initSettingsPanel() { /* Setup settings modal listeners */ const panel = $("settingsPanel"), openBtn = $("settingsBtn"), closeBtn = $("closeSettingsBtn"), themeSel = $("themeSelect"), ambToggle = $("ambientModeToggle"), resetBtn = $("resetSettingsBtn"); const open = () => { panel?.classList.add('active'); document.body.classList.add('modal-open'); }; const close = () => { closeOverlayElement(panel); }; if (openBtn) openBtn.onclick = open; if (closeBtn) closeBtn.onclick = close; if (panel) { panel.onclick = (e) => { if (e.target === panel) close(); }; attachModalSwipe(panel, close); } document.onkeydown = (e) => { if (e.key === 'Escape' && panel?.classList.contains('active')) close(); }; if (themeSel) { themeSel.value = currentThemeKey; themeSel.onchange = (e) => setTheme(e.target.value || DEFAULT_THEME); } const storedAmb = localStorage.getItem('ambientModeEnabled') === 'true'; if (ambToggle) { ambToggle.checked = storedAmb; ambToggle.onchange = () => localStorage.setItem('ambientModeEnabled', ambToggle.checked ? 'true' : 'false'); } if (resetBtn) resetBtn.onclick = () => { setTheme(DEFAULT_THEME); if (themeSel) themeSel.value = DEFAULT_THEME; selectedVoiceUri = ''; localStorage.removeItem('selectedVoiceUri'); populateVoices(); if (voiceSelect) voiceSelect.dispatchEvent(new Event('change')); if (ambToggle) { ambToggle.checked = false; localStorage.setItem('ambientModeEnabled', 'false'); } if ($("weatherWidget")) { $("weatherWidget").classList.remove('weather-minimized'); localStorage.removeItem('weatherMinimized'); } updateWeatherTitle(); }; }

function checkSharedPlan() { /* Check URL for ?plan=... */ try { const params = new URLSearchParams(window.location.search); if (params.has('plan')) { const data = JSON.parse(decodeURIComponent(atob(params.get('plan')))); if (data?.items) { localStorage.setItem('myPlan', JSON.stringify(data.items)); localStorage.removeItem('visitedPlan'); setTimeout(() => { loadPlan(); $("planModal").classList.add('active'); document.body.classList.add('modal-open'); }, 500); } } } catch (e) { console.warn('Failed to decode shared plan', e); } }

let uiEventsBound = false;
function initUiEvents() {
  if (uiEventsBound) return;
  uiEventsBound = true;

  const subMenuModal = $("subMenuModal");
  const closeSubMenuBtn = $("closeSubMenu");
  if (closeSubMenuBtn) closeSubMenuBtn.onclick = closeSubMenu;
  if (subMenuModal) {
    subMenuModal.addEventListener('click', (e) => { if (e.target === subMenuModal) closeSubMenu(); });
    attachModalSwipe(subMenuModal, closeSubMenu);
  }

  const loadMoreBtn = $("loadMoreResultsBtn");
  if (loadMoreBtn) {
    loadMoreBtn.onclick = () => {
      if (!currentPaginationHandle) return;
      appendNextResults = true;
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Scanning...';
      currentPaginationHandle.nextPage();
    };
  }

  const resultsModal = $("resultsModal");
  const closeResultsBtn = $("closeResults");
  if (closeResultsBtn) closeResultsBtn.onclick = closeResultsModal;
  if (resultsModal) {
    resultsModal.addEventListener('click', (e) => { if (e.target === resultsModal) closeResultsModal(); });
    attachModalSwipe(resultsModal, closeResultsModal);
  }

  const directionsPanel = $("directionsPanel");
  const toggleDirectionsBtn = $("toggleDirectionsPanel");
  if (toggleDirectionsBtn && directionsPanel) {
    toggleDirectionsBtn.setAttribute('aria-expanded', 'false');
    directionsPanel.setAttribute('aria-hidden', 'true');
    toggleDirectionsBtn.onclick = () => {
      const open = directionsPanel.classList.toggle('open');
      toggleDirectionsBtn.textContent = open ? 'Hide directions' : 'Show directions';
      toggleDirectionsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      directionsPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    };
  }

  const myPlanBtn = $("myPlanBtn");
  const planModal = $("planModal");
  if (myPlanBtn && planModal) {
    myPlanBtn.onclick = () => {
      loadPlan();
      planModal.classList.add('active');
      document.body.classList.add('modal-open');
    };
  }
  const closePlanBtn = $("closePlan");
  if (closePlanBtn) closePlanBtn.onclick = closePlan;
  if (planModal) {
    planModal.addEventListener('click', (e) => { if (e.target === planModal) closePlan(); });
    attachModalSwipe(planModal, closePlan);
  }
  const sharePlanBtn = $("sharePlanBtn");
  if (sharePlanBtn) sharePlanBtn.onclick = sharePlan;

  const myListBtn = $("myListBtn");
  const myListModal = $("myListModal");
  if (myListBtn && myListModal) {
    myListBtn.onclick = () => {
      loadMyList();
      myListModal.classList.add('active');
      document.body.classList.add('modal-open');
    };
  }
  const closeMyListBtn = $("closeMyList");
  if (closeMyListBtn) closeMyListBtn.onclick = closeMyList;
  if (myListModal) {
    myListModal.addEventListener('click', (e) => { if (e.target === myListModal) closeMyList(); });
    attachModalSwipe(myListModal, closeMyList);
  }

  const donateModal = $("donateModal");
  const closeDonateBtn = $("closeDonate");
  const donateBtn = $("donateBtn");
  if (donateBtn && donateModal) donateBtn.onclick = () => {
    donateModal.classList.add('active');
    document.body.classList.add('modal-open');
  };
  if (closeDonateBtn) closeDonateBtn.onclick = closeDonateModal;
  if (donateModal) {
    donateModal.addEventListener('click', (e) => { if (e.target === donateModal) closeDonateModal(); });
    attachModalSwipe(donateModal, closeDonateModal);
  }
}

setTheme(localStorage.getItem('selectedTheme') || DEFAULT_THEME, false);
