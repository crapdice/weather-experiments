/**
 * IP Geolocation lookup utilities for Railway hosting.
 * Uses ip-api.com free tier (45 requests/minute, no API key required).
 */

/**
 * Extracts the client's real IP address from request headers.
 * Railway and most reverse proxies set X-Forwarded-For.
 * 
 * @param headers - Request headers
 * @returns Client IP address or null if not found
 */
export function extractClientIp(headers: Headers): string | null {
    // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2, ...
    // The first one is the original client IP
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
        const firstIp = forwardedFor.split(',')[0].trim();
        return firstIp || null;
    }

    // Fallback to x-real-ip (used by some proxies like nginx)
    const realIp = headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }

    return null;
}

/**
 * Coordinates returned from IP geolocation lookup
 */
export interface GeoCoordinates {
    lat: number;
    lng: number;
}

/**
 * Looks up geographic coordinates for an IP address using ip-api.com.
 * 
 * @param ip - IP address to look up
 * @returns Coordinates or null if lookup fails
 */
export async function lookupIpLocation(ip: string | null): Promise<GeoCoordinates | null> {
    if (!ip) {
        return null;
    }

    try {
        // ip-api.com free tier - no API key required
        // Only request the fields we need to minimize response size
        const response = await fetch(
            `http://ip-api.com/json/${ip}?fields=status,lat,lon`,
            {
                // Short timeout to avoid blocking page load
                signal: AbortSignal.timeout(3000)
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (data.status !== 'success') {
            return null;
        }

        return {
            lat: data.lat,
            lng: data.lon // Note: ip-api uses "lon", we use "lng"
        };
    } catch {
        // Network error, timeout, or parsing error
        return null;
    }
}
