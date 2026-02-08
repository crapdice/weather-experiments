import { NextRequest, NextResponse } from 'next/server';
import { extractClientIp, lookupIpLocation } from '@/utils/ipGeoLookup';
import { findNearestCity } from '@/utils/geolocation';

/**
 * API Route: GET /api/geo-detect
 * 
 * Detects the user's nearest city based on their IP address.
 * Used by the GeoRedirect component for initial page load routing.
 * 
 * Returns:
 * - cityId: lowercase city ID (e.g., 'chi', 'mia', 'par')
 * - source: 'ip' if detected via IP, 'fallback' if defaulted
 * - coordinates: lat/lng if available (for debugging)
 */
export async function GET(request: NextRequest) {
    const headers = request.headers;
    const clientIp = extractClientIp(headers);

    // Try to get location from IP
    const coordinates = await lookupIpLocation(clientIp);

    if (coordinates) {
        const nearestCity = findNearestCity(coordinates.lat, coordinates.lng);
        return NextResponse.json({
            cityId: nearestCity.id.toLowerCase(),
            source: 'ip',
            coordinates: {
                lat: coordinates.lat,
                lng: coordinates.lng
            }
        });
    }

    // Fallback to Chicago if IP lookup fails
    return NextResponse.json({
        cityId: 'chi',
        source: 'fallback',
        coordinates: null
    });
}
