import { parse } from 'csv-parse/sync';
import { getAdminSettings } from '@/utils/adminSettings';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CITIES } from '@/utils/cityConfig';

// Map city IDs to their private file names
const CITY_FILES: Record<string, string> = {
    'CHI': 'chicago_weather_v86.csv',
    'NYC': 'nyc_weather.csv',
    'MIA': 'miami_weather.csv',
    'LAX': 'la_weather.csv',
    'DEN': 'denver_weather.csv',
    'PHX': 'phoenix_weather.csv',
    'PAR': 'parrish_weather.csv',
    'APT': 'aptos_weather.csv',
};

export async function GET(request: NextRequest) {
    const cityId = request.nextUrl.searchParams.get('cityId');

    if (!cityId) {
        return NextResponse.json({ error: 'Missing cityId parameter' }, { status: 400 });
    }

    // Validate against known cities to prevent directory traversal
    const normalizedId = cityId.toUpperCase();
    const fileName = CITY_FILES[normalizedId];

    if (!fileName) {
        return NextResponse.json({ error: 'Unknown city' }, { status: 404 });
    }

    // Verify the city exists in our config (double-check)
    const cityConfig = CITIES.find(c => c.id === normalizedId);
    if (!cityConfig) {
        return NextResponse.json({ error: 'City not configured' }, { status: 404 });
    }


    try {
        // Read from private directory (outside public/)
        const filePath = path.join(process.cwd(), 'private_data', fileName);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Data file not found' }, { status: 404 });
        }

        const csvContent = fs.readFileSync(filePath, 'utf-8');

        // Parse CSV to JSON
        const allRecords = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            cast: true
        });

        // Return full dataset for internal app
        const recentRecords = allRecords;

        // Return as JSON
        return NextResponse.json(recentRecords, {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, must-revalidate', // Force fresh fetch
                'Pragma': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Error reading weather data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
