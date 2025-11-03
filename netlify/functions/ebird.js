// Netlify Function to proxy eBird API requests
// Supports multiple eBird API v2 endpoints
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const apiKey = process.env.EBIRD_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const { 
      endpoint, 
      lat, 
      lng, 
      dist, 
      maxResults,
      regionCode,
      speciesCode,
      hotspotCode,
      back,
      fmt
    } = params;

    let url;
    const baseUrl = 'https://api.ebird.org/v2';

    // Route to different eBird API endpoints based on 'endpoint' parameter
    switch (endpoint) {
      case 'recent': // Recent observations by location
        if (!lat || !lng) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing lat or lng parameter' })
          };
        }
        url = `${baseUrl}/data/obs/geo/recent?lat=${lat}&lng=${lng}&dist=${dist || '25'}&maxResults=${maxResults || '50'}`;
        if (back) url += `&back=${back}`;
        break;

      case 'notable': // Notable/rare observations by location
        if (!lat || !lng) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing lat or lng parameter' })
          };
        }
        url = `${baseUrl}/data/obs/geo/recent/notable?lat=${lat}&lng=${lng}&dist=${dist || '25'}&maxResults=${maxResults || '50'}`;
        if (back) url += `&back=${back}`;
        break;

      case 'hotspots': // Nearby hotspots
        if (!lat || !lng) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing lat or lng parameter' })
          };
        }
        url = `${baseUrl}/ref/hotspot/geo?lat=${lat}&lng=${lng}&dist=${dist || '50'}`;
        if (back) url += `&back=${back}`;
        if (fmt) url += `&fmt=${fmt}`;
        break;

      case 'hotspot-info': // Specific hotspot information
        if (!hotspotCode) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing hotspotCode parameter' })
          };
        }
        url = `${baseUrl}/ref/hotspot/info/${hotspotCode}`;
        break;

      case 'hotspot-species': // Species seen at a hotspot
        if (!hotspotCode) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing hotspotCode parameter' })
          };
        }
        url = `${baseUrl}/product/spplist/${hotspotCode}`;
        break;

      case 'regional-hotspots': // Hotspots in a region
        if (!regionCode) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing regionCode parameter' })
          };
        }
        url = `${baseUrl}/ref/hotspot/${regionCode}`;
        if (back) url += `?back=${back}`;
        if (fmt) url += `${back ? '&' : '?'}fmt=${fmt}`;
        break;

      case 'nearest-species': // Nearest observations of a specific species
        if (!lat || !lng || !speciesCode) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing lat, lng, or speciesCode parameter' })
          };
        }
        url = `${baseUrl}/data/nearest/geo/recent/${speciesCode}?lat=${lat}&lng=${lng}&dist=${dist || '50'}`;
        if (back) url += `&back=${back}`;
        if (maxResults) url += `&maxResults=${maxResults}`;
        break;

      case 'species-list': // Species list for a region
        if (!regionCode) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing regionCode parameter' })
          };
        }
        url = `${baseUrl}/product/spplist/${regionCode}`;
        break;

      case 'taxonomy': // Get taxonomy information
        url = `${baseUrl}/ref/taxonomy/ebird`;
        if (speciesCode) url += `?species=${speciesCode}`;
        if (fmt) url += `${speciesCode ? '&' : '?'}fmt=${fmt}`;
        break;

      case 'checklist': // View a specific checklist
        const checklistId = params.checklistId;
        if (!checklistId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing checklistId parameter' })
          };
        }
        url = `${baseUrl}/product/checklist/view/${checklistId}`;
        break;

      case 'top100': // Top 100 contributors
        if (!regionCode) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing regionCode parameter' })
          };
        }
        url = `${baseUrl}/product/top100/${regionCode}`;
        if (back) url += `?back=${back}`;
        break;

      case 'stats': // Regional statistics
        if (!regionCode) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing regionCode parameter' })
          };
        }
        url = `${baseUrl}/product/stats/${regionCode}`;
        if (back) url += `?back=${back}`;
        break;

      default:
        // Default to recent observations for backward compatibility
        if (!lat || !lng) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing required parameters or invalid endpoint' })
          };
        }
        url = `${baseUrl}/data/obs/geo/recent?lat=${lat}&lng=${lng}&dist=${dist || '10'}&maxResults=${maxResults || '5'}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': apiKey
      }
    });
    
    if (!response.ok) {
      console.error('eBird API request failed:', response.status, response.statusText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `eBird API error: ${response.statusText}` })
      };
    }
    
    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('eBird API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch from eBird API', details: error.message })
    };
  }
};
