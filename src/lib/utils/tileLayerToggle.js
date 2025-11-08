import L from 'leaflet';
import { addTileLayer } from '$lib/utils/leafletMap';

const PROVIDERS = [
  { id: 'osm', label: 'Street' },
  { id: 'topo', label: 'Topo' },
  { id: 'satellite', label: 'Satellite' }
];

export function attachTileToggle(map, initialProvider = 'osm') {
  if (!map) return null;

  let activeProvider = initialProvider;
  let buttons = [];

  const TileToggleControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd() {
      const container = L.DomUtil.create('div', 'tile-layer-control');
      container.setAttribute('role', 'group');
      container.setAttribute('aria-label', 'Base map layers');

      buttons = PROVIDERS.map(({ id, label }) => {
        const button = L.DomUtil.create('button', 'tile-btn', container);
        button.type = 'button';
        button.textContent = label;
        button.setAttribute('data-provider', id);
        button.onclick = (event) => {
          L.DomEvent.stopPropagation(event);
          L.DomEvent.preventDefault(event);
          if (id === activeProvider) return;
          activeProvider = id;
          addTileLayer(map, id);
          updateActive();
        };
        return { id, button };
      });

      updateActive();
      L.DomEvent.disableClickPropagation(container);
      return container;
    }
  });

  const control = new TileToggleControl();
  control.addTo(map);

  function updateActive() {
    buttons.forEach(({ id, button }) => {
      if (id === activeProvider) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  return {
    setProvider(provider) {
      if (!provider || provider === activeProvider) return;
      activeProvider = provider;
      addTileLayer(map, provider);
      updateActive();
    },
    remove() {
      map.removeControl(control);
      buttons = [];
    }
  };
}
