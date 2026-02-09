import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractClientIp, lookupIpLocation } from '../ipGeoLookup';

describe('extractClientIp', () => {
    it('extracts IP from X-Forwarded-For header (single IP)', () => {
        const headers = new Headers();
        headers.set('x-forwarded-for', '203.0.113.195');
        expect(extractClientIp(headers)).toBe('203.0.113.195');
    });

    it('extracts first IP from X-Forwarded-For header (multiple IPs)', () => {
        const headers = new Headers();
        headers.set('x-forwarded-for', '203.0.113.195, 70.41.3.18, 150.172.238.178');
        expect(extractClientIp(headers)).toBe('203.0.113.195');
    });

    it('falls back to x-real-ip header', () => {
        const headers = new Headers();
        headers.set('x-real-ip', '198.51.100.178');
        expect(extractClientIp(headers)).toBe('198.51.100.178');
    });

    it('returns null when no IP headers present', () => {
        const headers = new Headers();
        expect(extractClientIp(headers)).toBeNull();
    });

    it('trims whitespace from IP addresses', () => {
        const headers = new Headers();
        headers.set('x-forwarded-for', '  203.0.113.195  ');
        expect(extractClientIp(headers)).toBe('203.0.113.195');
    });
});

describe('lookupIpLocation', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns coordinates for valid IP', async () => {
        // Mock fetch to return Chicago-area coordinates
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                status: 'success',
                lat: 41.8781,
                lon: -87.6298
            })
        });

        const result = await lookupIpLocation('203.0.113.195');
        expect(result).toEqual({ lat: 41.8781, lng: -87.6298 });
    });

    it('returns null for failed lookup', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                status: 'fail',
                message: 'reserved range'
            })
        });

        const result = await lookupIpLocation('127.0.0.1');
        expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const result = await lookupIpLocation('203.0.113.195');
        expect(result).toBeNull();
    });

    it('returns null for null IP input', async () => {
        const result = await lookupIpLocation(null);
        expect(result).toBeNull();
    });
});
