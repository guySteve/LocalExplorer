import React, { useEffect, useState } from 'react';
import './Weather.css';
import { WiSunrise, WiSunset, WiThermometer, WiStrongWind, WiHumidity } from 'react-icons/wi';

interface WeatherData {
    main: {
        temp: number;
        humidity: number;
    };
    weather: {
        main: string;
        description: string;
        icon: string;
    }[];
    wind: {
        speed: number;
    };
    sys: {
        sunrise: number;
        sunset: number;
    };
    name: string;
}

const Weather: React.FC = () => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                });
            },
            (error) => {
                setError('Unable to retrieve your location');
                console.error(error);
            }
        );
    }, []);

    useEffect(() => {
        if (location) {
            const fetchWeather = async () => {
                try {
                    const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
                    if (!apiKey) {
                        throw new Error("OpenWeatherMap API key not found.");
                    }
                    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${apiKey}`;
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error('Failed to fetch weather data');
                    }
                    const data = await response.json();
                    setWeather(data);
                } catch (err) {
                    if (err instanceof Error) {
                        setError(err.message);
                    } else {
                        setError('An unknown error occurred');
                    }
                    console.error(err);
                }
            };

            fetchWeather();
        }
    }, [location]);

    const getFunSaying = (temp: number, condition: string) => {
        if (condition.includes('Rain')) return "Don't forget your umbrella!";
        if (condition.includes('Clear')) return "Perfect day for a walk!";
        if (condition.includes('Clouds')) return "A bit gloomy, but still a good day.";
        if (temp > 30) return "It's hot! Stay hydrated.";
        if (temp < 10) return "Brrr! It's chilly, grab a coat.";
        return "Enjoy your day!";
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (error) {
        return <div className="weather-widget">Error: {error}</div>;
    }

    if (!weather) {
        return <div className="weather-widget">Loading weather...</div>;
    }

    const { main, weather: weatherInfo, wind, sys, name } = weather;
    const funSaying = getFunSaying(main.temp, weatherInfo[0].main);

    return (
        <div className="weather-widget">
            <div className="weather-main">
                <div className="weather-icon">
                    <img src={`http://openweathermap.org/img/wn/${weatherInfo[0].icon}@2x.png`} alt={weatherInfo[0].description} />
                </div>
                <div className="weather-details">
                    <div className="weather-location">{name}</div>
                    <div className="weather-temp">{Math.round(main.temp)}°C</div>
                    <div className="weather-condition">{weatherInfo[0].main}</div>
                </div>
            </div>
            <div className="weather-fun-saying">"{funSaying}"</div>
            <div className="weather-extra-info">
                <div className="info-item"><WiSunrise /> Sunrise: {formatTime(sys.sunrise)}</div>
                <div className="info-item"><WiSunset /> Sunset: {formatTime(sys.sunset)}</div>
                <div className="info-item"><WiHumidity /> Humidity: {main.humidity}%</div>
                <div className="info-item"><WiStrongWind /> Wind: {wind.speed.toFixed(1)} m/s</div>
            </div>
        </div>
    );
};

export default Weather;
