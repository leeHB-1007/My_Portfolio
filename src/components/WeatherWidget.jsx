import React, { useState, useEffect } from 'react';

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [city] = useState('Seoul'); // 기본 도시 설정, 또는 사용자 위치 기반으로 변경 가능

  useEffect(() => {
    const fetchWeather = async () => {
      if (!import.meta.env.VITE_WEATHER_API_KEY) {
        setError('Weather API key is not configured.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 사용자의 현재 위치를 가져오려면 navigator.geolocation.getCurrentPosition을 사용할 수 있습니다.
        // 여기서는 간단하게 고정된 도시를 사용합니다.
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city},kr&appid=${import.meta.env.VITE_WEATHER_API_KEY}&units=metric`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setWeather(data);
      } catch (e) {
        setError(e.message);
        console.error("Failed to fetch weather:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city]); // city가 변경될 때마다 날씨 정보를 다시 가져옵니다.

  if (loading) {
    return <div className="text-white text-xs p-2">Loading weather...</div>;
  }

  if (error) {
    return <div className="text-white text-xs p-2">Error: {error}</div>;
  }

  if (!weather) {
    return null;
  }

  return (
    <div className="text-white text-xs p-2 bg-black bg-opacity-50 rounded fixed top-4 right-4 z-50">
      <p className="font-semibold">{weather.name}</p>
      <p>{Math.round(weather.main.temp)}°C, {weather.weather[0].main}</p>
      {weather.weather[0].icon && (
        <img
          src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}.png`}
          alt={weather.weather[0].description}
          className="w-8 h-8 inline-block"
        />
      )}
    </div>
  );
};

export default WeatherWidget;