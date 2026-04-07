import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const WMO_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫', 51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌧',
  71: '🌨', 73: '❄️', 75: '❄️',
  80: '🌦', 81: '🌧', 82: '🌧',
  95: '⛈', 96: '⛈', 99: '⛈'
};

// This cron is called by Vercel Cron: every 3 hours
// Configured in vercel.json
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  let updated = 0;
  let errors = 0;

  // Fetch events starting in next 7 days that have venue with coordinates
  const { data: events } = await supabase
    .from('events')
    .select('id, starts_at, venues!inner(latitude, longitude)')
    .gte('starts_at', new Date().toISOString())
    .lte('starts_at', new Date(Date.now() + 7 * 86400000).toISOString())
    .not('weather_cache', 'is', null)
    .limit(50);

  // Also fetch events where weather_cache is null
  const { data: eventsNoCache } = await supabase
    .from('events')
    .select('id, starts_at, venues!inner(latitude, longitude)')
    .gte('starts_at', new Date().toISOString())
    .lte('starts_at', new Date(Date.now() + 7 * 86400000).toISOString())
    .is('weather_cache', null)
    .limit(50);

  const allEvents = [...(events || []), ...(eventsNoCache || [])];

  for (const event of allEvents) {
    const venue = (event as any).venues;
    if (!venue?.latitude || !venue?.longitude) continue;

    try {
      const startsAt = new Date(event.starts_at);
      const targetDate = event.starts_at.split('T')[0];
      const targetHour = startsAt.getHours();

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${venue.latitude}&longitude=${venue.longitude}&hourly=temperature_2m,precipitation_probability,weathercode,apparent_temperature,windspeed_10m&timezone=Europe/Zurich&forecast_days=7`,
        { cache: 'no-store' }
      );

      if (!res.ok) { errors++; continue; }
      const data = await res.json();

      const hourIdx = data.hourly?.time?.findIndex((t: string) => t.startsWith(targetDate));
      if (hourIdx === undefined || hourIdx < 0) { errors++; continue; }

      const offset = Math.min(hourIdx + targetHour, data.hourly.temperature_2m.length - 1);
      const code = data.hourly.weathercode[offset] || 0;

      const weatherCache = {
        temp_c: Math.round(data.hourly.temperature_2m[offset] || 0),
        feels_like: Math.round(data.hourly.apparent_temperature[offset] || 0),
        rain_pct: data.hourly.precipitation_probability[offset] || 0,
        wind_kmh: Math.round(data.hourly.windspeed_10m[offset] || 0),
        icon: WMO_ICONS[code] || '🌡️',
        umbrella: [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code),
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('events')
        .update({ weather_cache: weatherCache })
        .eq('id', event.id);

      updated++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    errors,
    total: allEvents.length,
    timestamp: new Date().toISOString()
  });
}
