// Netlify Function to proxy What3Words API requests
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

  const apiKey = process.env.WHAT3WORDS_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const { lat, lng } = event.queryStringParameters || {};
    
    if (!lat || !lng) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing lat or lng parameter' })
      };
    }

    const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('What3Words API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch What3Words data' })
    };
  }
};
