// Netlify Function to proxy Google Weather API requests and normalize the response
exports.handler = async (event) => {
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

  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Weather API key not configured' })
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const lat = parseFloat(params.lat);
    const lng = parseFloat(params.lng);
    const days = Math.min(Math.max(parseInt(params.days || '10', 10), 1), 16);
    const units = (params.units || 'imperial').toLowerCase() === 'metric' ? 'metric' : 'imperial';
    const language = params.language || 'en-US';

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid lat/lng parameters' })
      };
    }

    const googleUrl = new URL(`https://weather.googleapis.com/v1/geocode/${lat}/${lng}`);
    googleUrl.searchParams.set('key', apiKey);
    googleUrl.searchParams.set('units', units === 'metric' ? 'metric' : 'imperial');
    googleUrl.searchParams.set('language', language);

    const response = await fetch(googleUrl);

    if (!response.ok) {
      const errorBody = await safeParseJson(response);
      console.error('Google Weather API error', response.status, response.statusText, errorBody);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Google Weather API request failed',
          status: response.status,
          message: response.statusText,
          details: errorBody || null
        })
      };
    }

    const raw = await response.json();
    const normalized = normalizeGoogleWeather(raw, { lat, lng, days, units, language });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(normalized)
    };
  } catch (error) {
    console.error('Weather proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch weather data' })
    };
  }
};

async function safeParseJson(response) {
  try {
    return await response.clone().json();
  } catch (err) {
    return null;
  }
}

function normalizeGoogleWeather(raw, { lat, lng, days, units, language }) {
  const fetchedAt = new Date().toISOString();
  const current = extractCurrent(raw, units);
  const hourly = extractHourly(raw, units).slice(0, 24);
  const daily = extractDaily(raw, units).slice(0, days);

  return {
    metadata: {
      source: 'google-weather',
      fetchedAt,
      units,
      language,
      location: { lat, lng }
    },
    current,
    hourly,
    daily
  };
}

function extractCurrent(raw, units) {
  const data = raw?.currentConditions || raw?.current || raw?.currentWeather || {};
  const description = firstString([
    data.summary,
    data.weatherDescription,
    data.weather?.description,
    data.weatherCode?.toString(),
    data.conditionsDescription,
    data.conditions?.description
  ]) || 'Unknown conditions';

  const temperatureF = toFahrenheit(getValue(data.temperature));
  const feelsLikeF = toFahrenheit(getValue(data.apparentTemperature) ?? getValue(data.temperatureApparent));
  const dewPointF = toFahrenheit(getValue(data.dewPoint));
  const windMph = toMph(getValue(data.windSpeed));
  const windGustMph = toMph(getValue(data.windGust));
  const pressureMb = toPressureMb(getValue(data.pressure));
  const humidity = toPercent(data.humidity);
  const precipitationChance = toPercent(data.precipitationProbability ?? data.precipitationChance);
  const visibilityMiles = toMiles(getValue(data.visibility));
  const observationTime = data.updateTime || data.observationTime || data.validTime || data.asOf || null;

  return {
    description,
    icon: pickIcon(description, data.weatherCode?.toString()),
    temperatureF,
    temperatureC: toCelsius(temperatureF),
    feelsLikeF,
    feelsLikeC: toCelsius(feelsLikeF),
    dewPointF,
    dewPointC: toCelsius(dewPointF),
    humidity,
    windMph,
    windKph: windMph != null ? windMph * 1.60934 : null,
    windDirection: data.windDirection ?? data.wind?.direction ?? null,
    windGustMph,
    windGustKph: windGustMph != null ? windGustMph * 1.60934 : null,
    pressureMb,
    pressureInHg: pressureMb != null ? +(pressureMb * 0.02953).toFixed(2) : null,
    precipitationChance,
    uvIndex: getValue(data.uvIndex),
    visibilityMiles,
    observationTime
  };
}

function extractHourly(raw, units) {
  const hours = raw?.hourlyForecast?.hours || raw?.hourly?.hours || raw?.hourly || [];
  if (!Array.isArray(hours)) return [];

  return hours.map((hour) => {
    const time = hour?.startTime || hour?.forecastStartTime || hour?.validTime || hour?.time || null;
    const description = firstString([
      hour?.summary,
      hour?.weatherDescription,
      hour?.weatherConditions?.[0]?.description,
      hour?.conditions?.description
    ]) || 'Hourly forecast';

    const temperatureF = toFahrenheit(getValue(hour.temperature) ?? getValue(hour.temperatureApparent));
    const feelsLikeF = toFahrenheit(getValue(hour.apparentTemperature));

    return {
      time,
      description,
      icon: pickIcon(description, hour?.weatherConditions?.[0]?.code),
      temperatureF,
      temperatureC: toCelsius(temperatureF),
      feelsLikeF,
      feelsLikeC: toCelsius(feelsLikeF),
      precipitationChance: toPercent(hour?.precipitationProbability ?? hour?.precipitationChance),
      humidity: toPercent(hour?.humidity),
      windMph: toMph(getValue(hour?.windSpeed)),
      windDirection: hour?.windDirection || hour?.wind?.direction || null
    };
  }).filter((entry) => entry.time != null);
}

function extractDaily(raw, units) {
  const days = raw?.dailyForecast?.days || raw?.daily?.days || raw?.daily || [];
  if (!Array.isArray(days)) return [];

  return days.map((day) => {
    const date = day?.startTime || day?.forecastStartTime || day?.validTime || day?.time || null;
    const description = firstString([
      day?.summary,
      day?.weatherDescription,
      day?.weatherConditions?.[0]?.description,
      day?.conditions?.description
    ]) || 'Daily forecast';

    const highF = toFahrenheit(getValue(day?.temperatureMax) ?? getValue(day?.maxTemperature));
    const lowF = toFahrenheit(getValue(day?.temperatureMin) ?? getValue(day?.minTemperature));
    const sunrise = day?.sunriseTime || day?.sunrise || null;
    const sunset = day?.sunsetTime || day?.sunset || null;

    return {
      date,
      description,
      icon: pickIcon(description, day?.weatherConditions?.[0]?.code),
      highF,
      highC: toCelsius(highF),
      lowF,
      lowC: toCelsius(lowF),
      precipitationChance: toPercent(day?.precipitationProbability ?? day?.precipitationChance),
      humidity: toPercent(day?.humidity),
      windMph: toMph(getValue(day?.windSpeed)),
      sunrise,
      sunset
    };
  }).filter((entry) => entry.date != null);
}

function getValue(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'object') {
    if (typeof value.value === 'number') return value.value;
    if (typeof value.amount === 'number') return value.amount;
    if (typeof value.max === 'number') return value.max;
    if (typeof value.min === 'number') return value.min;
    if (typeof value.degrees === 'number') return value.degrees;
    if (typeof value.speed === 'number') return value.speed;
  }
  return null;
}

function toFahrenheit(value) {
  if (value == null) return null;
  return value;
}

function toCelsius(value) {
  if (value == null) return null;
  return ((value - 32) * 5) / 9;
}

function toMph(value) {
  if (value == null) return null;
  return value;
}

function toMiles(value) {
  if (value == null) return null;
  return value;
}

function toPressureMb(value) {
  if (value == null) return null;
  return value;
}

function toPercent(value) {
  if (value == null) return null;
  if (value > 1) return Math.round(value);
  return Math.round(value * 100);
}

function firstString(values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function pickIcon(description, code) {
  const key = (code || description || '').toString().toLowerCase();

  if (key.includes('thunder')) return '⛈️';
  if (key.includes('storm')) return '⛈️';
  if (key.includes('snow')) return '❄️';
  if (key.includes('sleet')) return '🌨️';
  if (key.includes('rain')) return '🌧️';
  if (key.includes('showers')) return '🌦️';
  if (key.includes('drizzle')) return '🌦️';
  if (key.includes('fog')) return '🌫️';
  if (key.includes('mist')) return '🌫️';
  if (key.includes('cloud')) return '☁️';
  if (key.includes('overcast')) return '☁️';
  if (key.includes('wind')) return '💨';
  if (key.includes('clear')) return '☀️';
  if (key.includes('sun')) return '☀️';
  if (key.includes('partly')) return '⛅';

  return '🌤️';
}
