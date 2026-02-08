'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { detectUserCity } from '@/utils/geolocation';
import { saveCity } from '@/utils/cityStorage';

type LocationStatus = 'idle' | 'detecting' | 'success' | 'error';

interface PreciseLocationButtonProps {
    /**
     * Current city ID to compare against detected city
     */
    currentCityId: string;
}

/**
 * Button component that allows users to refine their location using
 * the browser's Geolocation API (GPS/WiFi) for more accurate city detection.
 * 
 * This is Layer 2 of the hybrid approach - optional precision upgrade.
 */
export function PreciseLocationButton({ currentCityId }: PreciseLocationButtonProps) {
    const router = useRouter();
    const [status, setStatus] = useState<LocationStatus>('idle');
    const [message, setMessage] = useState<string>('');

    async function handleClick() {
        setStatus('detecting');
        setMessage('');

        try {
            const result = await detectUserCity();

            if (result.source === 'fallback') {
                setStatus('error');
                setMessage('Location access denied or unavailable');
                return;
            }

            const detectedCityId = result.city.id.toLowerCase();
            saveCity(detectedCityId);

            if (detectedCityId === currentCityId.toLowerCase()) {
                setStatus('success');
                setMessage(`You're already viewing ${result.city.name}!`);
            } else {
                setStatus('success');
                setMessage(`Switching to ${result.city.name}...`);
                router.push(`/city/${detectedCityId}`);
            }
        } catch {
            setStatus('error');
            setMessage('Failed to detect location');
        }
    }

    return (
        <div className="precise-location-container">
            <button
                onClick={handleClick}
                disabled={status === 'detecting'}
                className="precise-location-button"
                aria-label="Use my precise location"
            >
                {status === 'detecting' ? (
                    <>
                        <span className="spinner">⟳</span>
                        Detecting...
                    </>
                ) : (
                    <>
                        <span>📍</span>
                        Use my location
                    </>
                )}
            </button>

            {message && (
                <div className={`location-message ${status}`}>
                    {message}
                </div>
            )}

            <style jsx>{`
                .precise-location-container {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .precise-location-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid rgba(0, 255, 136, 0.3);
                    border-radius: 8px;
                    color: #00ff88;
                    font-size: 0.875rem;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .precise-location-button:hover:not(:disabled) {
                    background: linear-gradient(135deg, #1f1f3a 0%, #1a2744 100%);
                    border-color: rgba(0, 255, 136, 0.5);
                    box-shadow: 0 0 12px rgba(0, 255, 136, 0.2);
                }

                .precise-location-button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .spinner {
                    display: inline-block;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .location-message {
                    font-size: 0.75rem;
                    padding: 6px 10px;
                    border-radius: 4px;
                }

                .location-message.success {
                    background: rgba(0, 255, 136, 0.1);
                    color: #00ff88;
                }

                .location-message.error {
                    background: rgba(255, 100, 100, 0.1);
                    color: #ff6b6b;
                }
            `}</style>
        </div>
    );
}
