// Netlify Function to proxy Recreation.gov API requests
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

  const apiKey = process.env.RECREATION_GOV_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const { latitude, longitude, radius, limit } = event.queryStringParameters || {};
    
    if (!latitude || !longitude) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing latitude or longitude parameter' })
      };
    }

    const queryParams = new URLSearchParams({
      latitude,
      longitude,
      radius: radius || '50',
      limit: limit || '20'
    });

    const url = `https://ridb.recreation.gov/api/v1/facilities?${queryParams}`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': apiKey
      }
    });
    
    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Recreation.gov API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch recreation areas' })
    };
  }
};
