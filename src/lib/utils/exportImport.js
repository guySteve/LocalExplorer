// Export and import utilities for Field Journal data

/**
 * Export places to GPX format
 * @param {Array} places - Array of place objects
 * @param {string} filename - Optional filename
 * @returns {void}
 */
export function exportToGPX(places, filename = 'field-journal.gpx') {
  if (!places || places.length === 0) {
    throw new Error('No places to export');
  }

  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="LocalExplorer Field Journal" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>LocalExplorer Field Journal Export</name>
    <desc>Exported places from LocalExplorer</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>`;

  const gpxWaypoints = places.map(place => {
    const lat = place.location?.lat || place.lat;
    const lng = place.location?.lng || place.lng;
    
    if (!lat || !lng) return '';
    
    const name = escapeXml(place.name || 'Unnamed');
    const desc = escapeXml(place.notes || place.formatted_address || place.address || '');
    
    return `  <wpt lat="${lat}" lon="${lng}">
    <name>${name}</name>
    <desc>${desc}</desc>
    <time>${new Date(place.timestamp || place.created || Date.now()).toISOString()}</time>
  </wpt>`;
  }).filter(Boolean).join('\n');

  const gpxFooter = '\n</gpx>';
  const gpxContent = gpxHeader + '\n' + gpxWaypoints + gpxFooter;

  downloadFile(gpxContent, filename, 'application/gpx+xml');
}

/**
 * Export places to GeoJSON format
 * @param {Array} places - Array of place objects
 * @param {string} filename - Optional filename
 * @returns {void}
 */
export function exportToGeoJSON(places, filename = 'field-journal.geojson') {
  if (!places || places.length === 0) {
    throw new Error('No places to export');
  }

  const features = places.map(place => {
    const lat = place.location?.lat || place.lat;
    const lng = place.location?.lng || place.lng;
    
    if (!lat || !lng) return null;
    
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: {
        name: place.name || 'Unnamed',
        description: place.notes || place.formatted_address || place.address || '',
        timestamp: place.timestamp || place.created || Date.now(),
        tags: place.tags || [],
        isCustom: place.isCustom || false
      }
    };
  }).filter(Boolean);

  const geoJSON = {
    type: 'FeatureCollection',
    features: features
  };

  downloadFile(JSON.stringify(geoJSON, null, 2), filename, 'application/geo+json');
}

/**
 * Export places to CSV format
 * @param {Array} places - Array of place objects
 * @param {string} filename - Optional filename
 * @returns {void}
 */
export function exportToCSV(places, filename = 'field-journal.csv') {
  if (!places || places.length === 0) {
    throw new Error('No places to export');
  }

  const headers = ['Name', 'Latitude', 'Longitude', 'Address', 'Notes', 'Tags', 'Date'];
  const rows = places.map(place => {
    const lat = place.location?.lat || place.lat || '';
    const lng = place.location?.lng || place.lng || '';
    const name = (place.name || 'Unnamed').replace(/"/g, '""');
    const address = (place.formatted_address || place.address || '').replace(/"/g, '""');
    const notes = (place.notes || '').replace(/"/g, '""');
    const tags = (Array.isArray(place.tags) ? place.tags.join(', ') : '').replace(/"/g, '""');
    const date = new Date(place.timestamp || place.created || Date.now()).toLocaleDateString();
    
    return `"${name}","${lat}","${lng}","${address}","${notes}","${tags}","${date}"`;
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Export GPS track to GPX format
 * @param {Object} track - Track object with points array
 * @param {string} filename - Optional filename
 * @returns {void}
 */
export function exportTrackToGPX(track, filename = 'gps-track.gpx') {
  if (!track || !track.points || track.points.length === 0) {
    throw new Error('No track data to export');
  }

  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="LocalExplorer GPS Tracker" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(track.name || 'GPS Track')}</name>
    <desc>${escapeXml(track.notes || 'Recorded GPS track')}</desc>
    <time>${new Date(track.created || Date.now()).toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(track.name || 'GPS Track')}</name>
    <trkseg>`;

  const trackPoints = track.points.map(point => {
    return `      <trkpt lat="${point.lat}" lon="${point.lng}">
        <time>${new Date(point.timestamp || Date.now()).toISOString()}</time>
        ${point.elevation ? `<ele>${point.elevation}</ele>` : ''}
      </trkpt>`;
  }).join('\n');

  const gpxFooter = `
    </trkseg>
  </trk>
</gpx>`;

  const gpxContent = gpxHeader + '\n' + trackPoints + gpxFooter;
  downloadFile(gpxContent, filename, 'application/gpx+xml');
}

/**
 * Import GPX file
 * @param {File} file - GPX file to import
 * @returns {Promise<Array>} Array of imported places
 */
export async function importFromGPX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const gpxText = e.target.result;
        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
        
        // Check for parsing errors
        const parserError = gpxDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error('Invalid GPX file format');
        }
        
        const waypoints = gpxDoc.querySelectorAll('wpt');
        const trackPoints = gpxDoc.querySelectorAll('trkpt');
        
        const places = [];
        
        // Parse waypoints as places
        waypoints.forEach(wpt => {
          const lat = parseFloat(wpt.getAttribute('lat'));
          const lng = parseFloat(wpt.getAttribute('lon'));
          const name = wpt.querySelector('name')?.textContent || 'Imported Place';
          const desc = wpt.querySelector('desc')?.textContent || '';
          const time = wpt.querySelector('time')?.textContent;
          
          if (!isNaN(lat) && !isNaN(lng)) {
            places.push({
              name,
              location: { lat, lng },
              notes: desc,
              timestamp: time ? new Date(time).getTime() : Date.now(),
              isCustom: true,
              imported: true
            });
          }
        });
        
        // Parse track points if no waypoints
        if (places.length === 0 && trackPoints.length > 0) {
          // Create a single place from the track
          const firstPoint = trackPoints[0];
          const lat = parseFloat(firstPoint.getAttribute('lat'));
          const lng = parseFloat(firstPoint.getAttribute('lon'));
          
          if (!isNaN(lat) && !isNaN(lng)) {
            places.push({
              name: 'Imported Track Start',
              location: { lat, lng },
              notes: `Track with ${trackPoints.length} points`,
              timestamp: Date.now(),
              isCustom: true,
              imported: true
            });
          }
        }
        
        resolve(places);
      } catch (error) {
        reject(new Error(`Failed to parse GPX file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Helper function to escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Helper function to trigger file download
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 * @returns {void}
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
