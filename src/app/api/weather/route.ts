import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    try {
        if (type === 'current') {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=41.9742&longitude=-87.9073&current=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m&daily=temperature_2m_max,temperature_2m_min,rain_sum,snowfall_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FChicago&forecast_days=1`;
            const res = await fetch(url);
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
            const url = `https://archive-api.open-meteo.com/v1/archive?latitude=41.9742&longitude=-87.9073&start_date=${startStr}&end_date=${endStr}&daily=rain_sum,snowfall_sum&timezone=America%2FChicago`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Archive API error');
            const data = await res.json();
            return NextResponse.json(data);
        }

        if (type === 'forecast_past') {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=41.9742&longitude=-87.9073&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,rain_sum,snowfall_sum&temperature_unit=fahrenheit&timezone=America%2FChicago&past_days=7&forecast_days=1`;
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
