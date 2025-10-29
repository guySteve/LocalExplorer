// Netlify Function to proxy eBird API requests
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
    const { lat, lng, dist, maxResults } = event.queryStringParameters || {};
    
    if (!lat || !lng) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing lat or lng parameter' })
      };
    }

    const queryParams = new URLSearchParams({
      lat,
      lng,
      dist: dist || '10',
      maxResults: maxResults || '5'
    });

    const url = `https://api.ebird.org/v2/data/obs/geo/recent?${queryParams}`;
    
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': apiKey
      }
    });
    
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
      body: JSON.stringify({ error: 'Failed to fetch bird sightings' })
    };
  }
};
