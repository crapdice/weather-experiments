import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { getAdminSettings } from '@/utils/adminSettings';
import SunCalc from 'suncalc';

export const dynamic = 'force-dynamic';

function getSunTimes(date: Date) {
    // Default to Chicago coordinates
    const times = SunCalc.getTimes(date, 41.8781, -87.6298);
    return {
        sunrise: times.sunrise.toISOString(),
        sunset: times.sunset.toISOString()
    };
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId') || 'CHI';

    // Map cityId to file path (simplified for now based on known locations)
    let filePath = '';
    if (cityId === 'CHI') {
        filePath = path.join(process.cwd(), 'public', 'chicago_weather_v86.csv');
    } else {
        // Fallback or other cities
        filePath = path.join(process.cwd(), 'public', 'chicago_weather_v86.csv');
    }

    try {
        if (!fs.existsSync(filePath)) {
            return NextResponse.json(
                { error: 'Data source not found' },
                { status: 404 }
            );
        }

        const csvContent = fs.readFileSync(filePath, 'utf-8');

        // Parse CSV to JSON
        const allRecords = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            cast: true
        });

        // Limit to configurable weeks
        const settings = getAdminSettings();
        // If settings were not found or uninitialized, default to 2 weeks for PUBLIC
        const daysToReturn = (settings.publicApiWeeks || 2) * 7;

        // Ensure we don't try to get more than exists
        const actualDaysToReturn = Math.min(daysToReturn, allRecords.length);
        const rawRecentRecords = allRecords.slice(-actualDaysToReturn);

        // Enrich with Sunrise/Sunset
        const recentRecords = rawRecentRecords.map((record: any) => {
            if (record.Date) {
                const dateObj = new Date(record.Date);
                const sunTimes = getSunTimes(dateObj);
                return { ...record, ...sunTimes };
            }
            return record;
        });

        return NextResponse.json({
            meta: {
                city: cityId === 'CHI' ? 'Chicago, IL' : 'Unknown',
                source: "National Weather Service / Open-Meteo",
                count: recentRecords.length,
                limit_weeks: settings.publicApiWeeks || 2,
                generated_at: new Date().toISOString(),
                documentation: "Data restricted by admin configuration.",
                fields: {
                    "Date": "ISO 8601 Date Date (YYYY-MM-DD)",
                    "Max Temp (°F)": "Daily maximum temperature in Fahrenheit",
                    "Min Temp (°F)": "Daily minimum temperature in Fahrenheit",
                    "Avg Temp (°F)": "Daily average temperature in Fahrenheit",
                    "Precipitation (in)": "Total daily precipitation in inches",
                    "Snowfall (in)": "Total daily snowfall in inches",
                    "Max Wind Speed (mph)": "Maximum sustained wind speed in miles per hour",
                    "Max Wind Gust (mph)": "Maximum instantaneous wind gust in miles per hour",
                    "sunrise": "ISO 8601 timestamp of sunrise",
                    "sunset": "ISO 8601 timestamp of sunset"
                }
            },
            data: recentRecords
        }, {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
            },
        });
    } catch (error) {
        console.error('Error serving public weather data:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
