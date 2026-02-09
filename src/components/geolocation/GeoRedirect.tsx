'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSavedCity, saveCity } from '@/utils/cityStorage';

/**
 * Response from /api/geo-detect
 */
interface GeoDetectResponse {
    cityId: string;
    source: 'ip' | 'fallback';
    coordinates: { lat: number; lng: number } | null;
}

/**
 * Client component that handles geolocation-based routing.
 * 
 * Flow:
 * 1. Check localStorage for saved city preference
 * 2. If found, redirect immediately
 * 3. If not, call /api/geo-detect for IP-based detection
 * 4. Save detected city and redirect
 */
export function GeoRedirect() {
    const router = useRouter();
    const [status, setStatus] = useState<'detecting' | 'redirecting'>('detecting');

    useEffect(() => {
        async function detectAndRedirect() {
            // Step 1: Check for saved preference
            const savedCity = getSavedCity();
            if (savedCity) {
                setStatus('redirecting');
                router.replace(`/city/${savedCity}`);
                return;
            }

            // Step 2: Detect via IP geolocation
            try {
                const response = await fetch('/api/geo-detect');
                if (response.ok) {
                    const data: GeoDetectResponse = await response.json();

                    // Save for future visits
                    saveCity(data.cityId);

                    setStatus('redirecting');
                    router.replace(`/city/${data.cityId}`);
                    return;
                }
            } catch {
                // API error - fall through to default
            }

            // Step 3: Fallback to Chicago
            saveCity('chi');
            setStatus('redirecting');
            router.replace('/city/chi');
        }

        detectAndRedirect();
    }, [router]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#0a0a0a',
            color: '#00ff88',
            fontFamily: 'monospace'
        }}>
            <div style={{
                fontSize: '1.5rem',
                marginBottom: '1rem',
                animation: 'pulse 1.5s ease-in-out infinite'
            }}>
                {status === 'detecting' ? '📡 Detecting your location...' : '🚀 Redirecting...'}
            </div>
            <div style={{
                width: '200px',
                height: '4px',
                backgroundColor: '#1a1a2e',
                borderRadius: '2px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: '40%',
                    height: '100%',
                    backgroundColor: '#00ff88',
                    borderRadius: '2px',
                    animation: 'loading 1s ease-in-out infinite'
                }} />
            </div>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(350%); }
                }
            `}</style>
        </div>
    );
}
