import { NextRequest, NextResponse } from 'next/server';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

const WMO_CODES: Record<number, { label: string; icon: string; umbrella: boolean }> = {
  0: { label: 'Soleggiato', icon: '☀️', umbrella: false },
  1: { label: 'Prevalentemente sereno', icon: '🌤', umbrella: false },
  2: { label: 'Parzialmente nuvoloso', icon: '⛅', umbrella: false },
  3: { label: 'Nuvoloso', icon: '☁️', umbrella: false },
  45: { label: 'Nebbia', icon: '🌫', umbrella: false },
  48: { label: 'Nebbia gelata', icon: '🌫', umbrella: false },
  51: { label: 'Pioggerella', icon: '🌦', umbrella: true },
  53: { label: 'Pioggerella moderata', icon: '🌦', umbrella: true },
  55: { label: 'Pioggerella intensa', icon: '🌧', umbrella: true },
  61: { label: 'Pioggia', icon: '🌧', umbrella: true },
  63: { label: 'Pioggia moderata', icon: '🌧', umbrella: true },
  65: { label: 'Pioggia intensa', icon: '🌧', umbrella: true },
  71: { label: 'Neve', icon: '🌨', umbrella: true },
  73: { label: 'Neve moderata', icon: '❄️', umbrella: true },
  75: { label: 'Neve intensa', icon: '❄️', umbrella: true },
  80: { label: 'Rovesci', icon: '🌦', umbrella: true },
  81: { label: 'Rovesci moderati', icon: '🌧', umbrella: true },
  82: { label: 'Rovesci intensi', icon: '🌧', umbrella: true },
  95: { label: 'Temporale', icon: '⛈', umbrella: true },
  96: { label: 'Temporale con grandine', icon: '⛈', umbrella: true },
  99: { label: 'Temporale con grandine intensa', icon: '⛈', umbrella: true }
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const date = searchParams.get('date'); // ISO date string

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  try {
    const url = new URL(OPEN_METEO_BASE);
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weathercode,windspeed_10m,apparent_temperature');
    url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
    url.searchParams.set('timezone', 'Europe/Zurich');
    url.searchParams.set('forecast_days', '7');

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error('Weather API error');

    const data = await res.json();

    // Find hourly data for the event date/time
    let weatherForDate = null;
    if (date) {
      const targetDate = date.split('T')[0];
      const hourIdx = data.hourly?.time?.findIndex((t: string) => t.startsWith(targetDate));
      if (hourIdx !== undefined && hourIdx >= 0) {
        const code = data.hourly.weathercode[hourIdx] || 0;
        const wmo = WMO_CODES[code] || WMO_CODES[0];
        weatherForDate = {
          temp_c: Math.round(data.hourly.temperature_2m[hourIdx]),
          feels_like: Math.round(data.hourly.apparent_temperature[hourIdx]),
          condition: wmo.label,
          icon: wmo.icon,
          umbrella: wmo.umbrella,
          rain_pct: data.hourly.precipitation_probability[hourIdx] || 0,
          wind_kmh: Math.round(data.hourly.windspeed_10m[hourIdx] || 0)
        };
      }
    }

    // Current weather (first hour)
    const currentCode = data.hourly?.weathercode?.[0] || 0;
    const currentWmo = WMO_CODES[currentCode] || WMO_CODES[0];
    const current = {
      temp_c: Math.round(data.hourly?.temperature_2m?.[0] || 0),
      feels_like: Math.round(data.hourly?.apparent_temperature?.[0] || 0),
      condition: currentWmo.label,
      icon: currentWmo.icon,
      umbrella: currentWmo.umbrella,
      rain_pct: data.hourly?.precipitation_probability?.[0] || 0,
      wind_kmh: Math.round(data.hourly?.windspeed_10m?.[0] || 0)
    };

    return NextResponse.json({
      current,
      forEvent: weatherForDate,
      daily: data.daily
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' }
    });
  } catch (err) {
    console.error('Weather API error:', err);
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 503 });
  }
}
