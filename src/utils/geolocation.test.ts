import { describe, it, expect } from 'vitest';
import { haversineDistance, findNearestCity } from './geolocation';
import { CITIES } from './cityConfig';

describe('haversineDistance', () => {
    it('returns 0 for identical coordinates', () => {
        const distance = haversineDistance(41.9742, -87.9073, 41.9742, -87.9073);
        expect(distance).toBe(0);
    });

    it('calculates distance between Chicago and New York (~1150 km)', () => {
        // Chicago O'Hare to JFK
        const distance = haversineDistance(41.9742, -87.9073, 40.7128, -74.0060);
        expect(distance).toBeGreaterThan(1100);
        expect(distance).toBeLessThan(1200);
    });

    it('calculates distance between Chicago and Miami (~1900 km)', () => {
        const distance = haversineDistance(41.9742, -87.9073, 25.7617, -80.1918);
        expect(distance).toBeGreaterThan(1850);
        expect(distance).toBeLessThan(2000);
    });

    it('calculates distance between Los Angeles and Phoenix (~600 km)', () => {
        const distance = haversineDistance(34.0522, -118.2437, 33.4484, -112.0740);
        expect(distance).toBeGreaterThan(550);
        expect(distance).toBeLessThan(650);
    });
});

describe('findNearestCity', () => {
    it('returns Chicago for downtown Chicago coordinates', () => {
        // Downtown Chicago (The Loop)
        const nearest = findNearestCity(41.8781, -87.6298);
        expect(nearest.id).toBe('CHI');
    });

    it('returns Chicago for Milwaukee coordinates (closer to Chicago than any other city)', () => {
        // Milwaukee, WI
        const nearest = findNearestCity(43.0389, -87.9065);
        expect(nearest.id).toBe('CHI');
    });

    it('returns Miami for Miami Beach coordinates', () => {
        // Miami Beach
        const nearest = findNearestCity(25.7907, -80.1300);
        expect(nearest.id).toBe('MIA');
    });

    it('returns Parrish for Tampa/Bradenton area', () => {
        // Bradenton, FL (close to Parrish)
        const nearest = findNearestCity(27.4989, -82.5748);
        expect(nearest.id).toBe('PAR');
    });

    it('returns Los Angeles for Santa Monica coordinates', () => {
        // Santa Monica
        const nearest = findNearestCity(34.0195, -118.4912);
        expect(nearest.id).toBe('LAX');
    });

    it('returns Phoenix for Scottsdale coordinates', () => {
        // Scottsdale, AZ
        const nearest = findNearestCity(33.4942, -111.9261);
        expect(nearest.id).toBe('PHX');
    });

    it('returns Denver for Boulder coordinates', () => {
        // Boulder, CO
        const nearest = findNearestCity(40.0150, -105.2705);
        expect(nearest.id).toBe('DEN');
    });

    it('returns New York for Newark coordinates', () => {
        // Newark, NJ
        const nearest = findNearestCity(40.7357, -74.1724);
        expect(nearest.id).toBe('NYC');
    });

    it('handles edge case: exact city coordinates', () => {
        // Using exact Chicago O'Hare coordinates from config
        const chicagoCity = CITIES.find(c => c.id === 'CHI')!;
        const nearest = findNearestCity(chicagoCity.lat, chicagoCity.lng);
        expect(nearest.id).toBe('CHI');
    });

    it('handles ambiguous midpoint by choosing one city (deterministic)', () => {
        // Midpoint between Chicago and NYC (somewhere in Indiana/Ohio)
        const midLat = (41.9742 + 40.7128) / 2;
        const midLng = (-87.9073 + -74.0060) / 2;
        const nearest = findNearestCity(midLat, midLng);
        // Should be deterministic - same result each time
        const nearest2 = findNearestCity(midLat, midLng);
        expect(nearest.id).toBe(nearest2.id);
    });
});

describe('findNearestCity with default fallback', () => {
    it('returns a valid city for any coordinates (no undefined)', () => {
        // Random ocean coordinates
        const nearest = findNearestCity(0, 0);
        expect(nearest).toBeDefined();
        expect(nearest.id).toBeDefined();
    });
});
