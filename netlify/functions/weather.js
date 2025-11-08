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
    console.warn('Weather API key not configured, Open-Meteo fallback will be used');
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

    let weatherPayload = null;
    let primaryError = null;

    if (apiKey) {
      try {
        weatherPayload = await fetchGoogleWeather({
          lat,
          lng,
          days,
          units,
          language,
          apiKey
        });
      } catch (err) {
        primaryError = err;
        console.warn('Google Weather failed, attempting Open-Meteo fallback:', err.message);
      }
    } else {
      primaryError = new Error('Weather API key not configured');
      console.warn('Weather API key missing, using Open-Meteo fallback');
    }

    if (!weatherPayload) {
      weatherPayload = await fetchOpenMeteoWeather({
        lat,
        lng,
        days,
        units
      });

      if (primaryError) {
        weatherPayload.metadata = weatherPayload.metadata || {};
        weatherPayload.metadata.fallback = {
          reason: primaryError.message || 'google-weather failed',
          source: 'google-weather'
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(weatherPayload)
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

async function fetchGoogleWeather({ lat, lng, days, units, language, apiKey }) {
  const googleUrl = new URL(`https://weather.googleapis.com/v1/geocode/${lat}/${lng}`);
  googleUrl.searchParams.set('key', apiKey);
  googleUrl.searchParams.set('units', units === 'metric' ? 'metric' : 'imperial');
  googleUrl.searchParams.set('language', language);

  const response = await fetch(googleUrl);

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    const error = new Error(errorBody?.error || errorBody?.message || 'Google Weather API request failed');
    error.statusCode = response.status;
    error.details = errorBody || null;
    throw error;
  }

  const raw = await response.json();
  return normalizeGoogleWeather(raw, { lat, lng, days, units, language });
}

async function fetchOpenMeteoWeather({ lat, lng, days, units }) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    current_weather: 'true',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,relativehumidity_2m,weathercode,windspeed_10m,winddirection_10m',
    daily: 'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,windspeed_10m_max',
    timezone: 'auto',
    forecast_days: Math.min(days, 16).toString()
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    const error = new Error(errorBody?.reason || 'Open-Meteo API request failed');
    error.statusCode = response.status;
    error.details = errorBody || null;
    throw error;
  }

  const raw = await response.json();
  return normalizeOpenMeteoWeather(raw, { lat, lng, days, units });
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

function normalizeOpenMeteoWeather(raw, { lat, lng, days, units }) {
  const fetchedAt = new Date().toISOString();
  const current = raw?.current_weather || null;
  const hourly = raw?.hourly || {};
  const daily = raw?.daily || {};

  const hourlyTimes = Array.isArray(hourly.time) ? hourly.time : [];
  const dailyTimes = Array.isArray(daily.time) ? daily.time : [];

  const currentTimeIndex = current?.time ? hourlyTimes.indexOf(current.time) : -1;
  const currentSummary = weatherCodeToSummary(current?.weathercode);
  const currentTempC = current?.temperature ?? null;
  const currentFeelsLikeC = currentTimeIndex >= 0 && Array.isArray(hourly.apparent_temperature)
    ? hourly.apparent_temperature[currentTimeIndex]
    : currentTempC;
  const currentHumidity = currentTimeIndex >= 0 && Array.isArray(hourly.relativehumidity_2m)
    ? hourly.relativehumidity_2m[currentTimeIndex]
    : null;
  const currentPrecip = currentTimeIndex >= 0 && Array.isArray(hourly.precipitation_probability)
    ? hourly.precipitation_probability[currentTimeIndex]
    : null;
  const currentWindKph = current?.windspeed ?? null;
  const currentWindDir = current?.winddirection ?? null;

  const normalizedCurrent = current
    ? {
        description: currentSummary.text,
        icon: currentSummary.icon,
        temperatureF: celsiusToFahrenheit(currentTempC),
        temperatureC: currentTempC,
        feelsLikeF: celsiusToFahrenheit(currentFeelsLikeC),
        feelsLikeC: currentFeelsLikeC,
        dewPointF: null,
        dewPointC: null,
        humidity: normalizePercent(currentHumidity),
        windMph: kphToMph(currentWindKph),
        windKph: currentWindKph,
        windDirection: currentWindDir,
        windGustMph: null,
        windGustKph: null,
        pressureMb: null,
        pressureInHg: null,
        precipitationChance: normalizePercent(currentPrecip),
        uvIndex: null,
        visibilityMiles: null,
        observationTime: current.time || null
      }
    : null;

  const hourlyCount = Math.min(hourlyTimes.length, days * 24);
  const normalizedHourly = [];
  for (let i = 0; i < hourlyCount; i += 1) {
    const summary = weatherCodeToSummary(hourly.weathercode?.[i]);
    const tempC = hourly.temperature_2m?.[i] ?? null;
    const feelsC = hourly.apparent_temperature?.[i] ?? tempC;
    const windKph = hourly.windspeed_10m?.[i] ?? null;
    normalizedHourly.push({
      time: hourlyTimes[i],
      description: summary.text,
      icon: summary.icon,
      temperatureF: celsiusToFahrenheit(tempC),
      temperatureC: tempC,
      feelsLikeF: celsiusToFahrenheit(feelsC),
      feelsLikeC: feelsC,
      precipitationChance: normalizePercent(hourly.precipitation_probability?.[i]),
      humidity: normalizePercent(hourly.relativehumidity_2m?.[i]),
      windMph: kphToMph(windKph),
      windDirection: hourly.winddirection_10m?.[i] ?? null
    });
  }

  const dailyCount = Math.min(dailyTimes.length, days);
  const normalizedDaily = [];
  for (let i = 0; i < dailyCount; i += 1) {
    const summary = weatherCodeToSummary(daily.weathercode?.[i]);
    const highC = daily.temperature_2m_max?.[i] ?? null;
    const lowC = daily.temperature_2m_min?.[i] ?? null;
    const windKph = daily.windspeed_10m_max?.[i] ?? null;
    normalizedDaily.push({
      date: dailyTimes[i],
      description: summary.text,
      icon: summary.icon,
      highF: celsiusToFahrenheit(highC),
      highC,
      lowF: celsiusToFahrenheit(lowC),
      lowC,
      precipitationChance: normalizePercent(daily.precipitation_probability_max?.[i]),
      humidity: null,
      windMph: kphToMph(windKph),
      sunrise: daily.sunrise?.[i] ?? null,
      sunset: daily.sunset?.[i] ?? null
    });
  }

  return {
    metadata: {
      source: 'open-meteo',
      fetchedAt,
      units,
      language: 'en-US',
      location: { lat, lng }
    },
    current: normalizedCurrent,
    hourly: normalizedHourly,
    daily: normalizedDaily
  };
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

function celsiusToFahrenheit(value) {
  if (value == null) return null;
  return (value * 9) / 5 + 32;
}

function kphToMph(value) {
  if (value == null) return null;
  return value / 1.60934;
}

function normalizePercent(value) {
  if (value == null) return null;
  if (value > 1) {
    return Math.round(Math.min(value, 100));
  }
  return Math.round(value * 100);
}

function weatherCodeToSummary(code) {
  const map = {
    0: { icon: '☀️', text: 'Clear' },
    1: { icon: '🌤️', text: 'Mostly clear' },
    2: { icon: '⛅', text: 'Partly cloudy' },
    3: { icon: '☁️', text: 'Overcast' },
    45: { icon: '🌫️', text: 'Fog' },
    48: { icon: '🌫️', text: 'Icy fog' },
    51: { icon: '🌦️', text: 'Light drizzle' },
    53: { icon: '🌦️', text: 'Drizzle' },
    55: { icon: '🌧️', text: 'Heavy drizzle' },
    61: { icon: '🌦️', text: 'Light rain' },
    63: { icon: '🌧️', text: 'Rain' },
    65: { icon: '🌧️', text: 'Heavy rain' },
    71: { icon: '🌨️', text: 'Light snow' },
    73: { icon: '🌨️', text: 'Snow' },
    75: { icon: '❄️', text: 'Heavy snow' },
    80: { icon: '🌦️', text: 'Showers' },
    82: { icon: '⛈️', text: 'Heavy showers' },
    95: { icon: '⛈️', text: 'Thunderstorm' }
  };
  return map[code] || { icon: '🌤️', text: 'Mixed' };
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
