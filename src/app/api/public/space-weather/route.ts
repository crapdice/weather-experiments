import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Types for NOAA Data
interface KPIndexRecord {
    time_tag: string;
    kp_index: number;
    estimated_kp: number;
}

// [time_tag, density, speed, temperature]
type PlasmaRecord = [string, string, string, string];

// [time_tag, bx, by, bz, lon, lat, bt]
type MagRecord = [string, string, string, string, string, string, string];

export async function GET(request: NextRequest) {
    try {
        const endpoints = {
            kIndex: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
            plasma: 'https://services.swpc.noaa.gov/products/solar-wind/plasma-6-hour.json',
            mag: 'https://services.swpc.noaa.gov/products/solar-wind/mag-6-hour.json',
        };

        // Fetch all in parallel
        const [kRes, plasmaRes, magRes] = await Promise.all([
            fetch(endpoints.kIndex, { next: { revalidate: 300 } }),
            fetch(endpoints.plasma, { next: { revalidate: 300 } }),
            fetch(endpoints.mag, { next: { revalidate: 300 } })
        ]);

        if (!kRes.ok || !plasmaRes.ok || !magRes.ok) {
            throw new Error(`One or more NOAA APIs failed.`);
        }

        const kData: KPIndexRecord[] = await kRes.json();
        const plasmaDataRaw: PlasmaRecord[] = await plasmaRes.json();
        const magDataRaw: MagRecord[] = await magRes.json();

        // --- Process K-Index ---
        const lastK = kData.length > 0 ? kData[kData.length - 1] : null;
        const maxKp24h = kData.slice(-1440).reduce((max, d) => Math.max(max, d.kp_index), 0); // Approx last 24h

        // --- Process Solar Wind (Plasma) ---
        // Header row usually exists, skip it if present
        const plasmaData = plasmaDataRaw.slice(1).map(row => ({
            time_tag: row[0],
            density: parseFloat(row[1]),
            speed: parseFloat(row[2]), // km/s
            temperature: parseFloat(row[3])
        }));
        const lastPlasma = plasmaData.length > 0 ? plasmaData[plasmaData.length - 1] : null;

        // --- Process Magnetic Field (Mag) ---
        const magData = magDataRaw.slice(1).map(row => ({
            time_tag: row[0],
            bz: parseFloat(row[3]), // nT (Interplanetary Magnetic Field North-South component)
            bt: parseFloat(row[6])  // nT (Total Field)
        }));
        const lastMag = magData.length > 0 ? magData[magData.length - 1] : null;

        return NextResponse.json({
            meta: {
                source: "NOAA Space Weather Prediction Center",
                generated_at: new Date().toISOString(),
                documentation: "Consolidated space weather metrics.",
                fields: {
                    "kp_index": "Geomagnetic activity index (0-9)",
                    "solar_wind_speed": "Solar wind velocity in km/s",
                    "solar_wind_density": "Protons per cubic cm",
                    "bz": "North-South direction of magnetic field (nT). Negative is better for auroras.",
                    "bt": "Total magnetic field strength (nT)"
                }
            },
            data: {
                current: {
                    kp_index: lastK?.kp_index ?? null,
                    solar_wind_speed: lastPlasma?.speed ?? null,
                    solar_wind_density: lastPlasma?.density ?? null,
                    bz: lastMag?.bz ?? null,
                    bt: lastMag?.bt ?? null,
                    timestamp: new Date().toISOString()
                },
                statistics: {
                    max_kp_24h: maxKp24h
                },
                history: {
                    k_index: kData.slice(-100), // Last ~100 mins
                    plasma: plasmaData.slice(-50), // Last ~50 records
                    magnetic: magData.slice(-50)
                }
            }
        }, {
            headers: {
                'Cache-Control': 's-maxage=300, stale-while-revalidate',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
            }
        });

    } catch (error) {
        console.error('Space Weather API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch space weather data' },
            { status: 500 }
        );
    }
}
