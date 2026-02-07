import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    // Default to O'Hare (Chicago)
    const lat = searchParams.get('lat') || '41.9742';
    const lng = searchParams.get('lng') || '-87.9073';

    try {
        if (type === 'current') {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,rain_sum,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=1&past_days=14`;
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error('Weather API error');
            const data = await res.json();
            return NextResponse.json(data);
        }

        if (type === 'archive') {
            const startStr = searchParams.get('start');
            const endStr = searchParams.get('end');
            if (!startStr || !endStr) {
                return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 });
            }
            const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startStr}&end_date=${endStr}&daily=rain_sum,snowfall_sum&timezone=auto`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Archive API error');
            const data = await res.json();
            return NextResponse.json(data);
        }

        if (type === 'forecast_past') {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,rain_sum,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max&temperature_unit=fahrenheit&timezone=auto&past_days=7&forecast_days=1`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Forecast API error');
            const data = await res.json();
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
