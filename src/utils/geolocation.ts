import { CityConfig } from '@/types/weather';
import { CITIES } from './cityConfig';

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Calculates the distance between two geographic coordinates using the Haversine formula.
 * @param lat1 Latitude of point 1 in degrees
 * @param lng1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lng2 Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export function haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Finds the nearest configured city to the given coordinates.
 * @param userLat User's latitude in degrees
 * @param userLng User's longitude in degrees
 * @returns The nearest CityConfig object
 */
export function findNearestCity(userLat: number, userLng: number): CityConfig {
    let nearestCity = CITIES[0]; // Default to first city (Chicago)
    let minDistance = Infinity;

    for (const city of CITIES) {
        const distance = haversineDistance(userLat, userLng, city.lat, city.lng);
        if (distance < minDistance) {
            minDistance = distance;
            nearestCity = city;
        }
    }

    return nearestCity;
}

/**
 * Type for geolocation result
 */
export interface GeolocationResult {
    city: CityConfig;
    source: 'browser' | 'ip' | 'fallback';
    accuracy?: number; // meters, only for browser geolocation
}

/**
 * Detects user's city using the Browser Geolocation API.
 * Falls back to the default city (Chicago) if geolocation is unavailable or denied.
 * @returns Promise resolving to the detected city
 */
export async function detectUserCity(): Promise<GeolocationResult> {
    // Check if geolocation is available
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return {
            city: CITIES[0],
            source: 'fallback'
        };
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const nearest = findNearestCity(
                    position.coords.latitude,
                    position.coords.longitude
                );
                resolve({
                    city: nearest,
                    source: 'browser',
                    accuracy: position.coords.accuracy
                });
            },
            () => {
                // Geolocation denied or error - fall back to default
                resolve({
                    city: CITIES[0],
                    source: 'fallback'
                });
            },
            {
                enableHighAccuracy: false, // Low accuracy is faster and sufficient for city detection
                timeout: 5000,
                maximumAge: 300000 // Cache for 5 minutes
            }
        );
    });
}
