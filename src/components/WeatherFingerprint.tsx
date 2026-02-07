'use client';

import React, { useMemo, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { WeatherRecord } from '@/utils/weatherData';

interface Props {
    data: WeatherRecord[];
}

const FingerprintMesh = ({ record }: { record: WeatherRecord }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Data Mappings
    const temp = record['Avg Temp (°F)']; // Range: -20 to 100
    const wind = record['Max Wind Speed (mph)'] || 5; // Range: 0 to 60
    const precip = record['Precipitation (in)'] || 0; // Range: 0 to 5
    const snow = record['Snowfall (in)'] || 0; // Range: 0 to 20

    // 1. Color (Temp)
    // Cold (<32) = Blue/Cyan, Moderate (32-70) = Green/Teal, Hot (>70) = Orange/Red
    const color = useMemo(() => {
        const t = new THREE.Color();
        if (temp < 32) t.setHSL(0.55, 0.8, 0.5); // Cyan-ish
        else if (temp < 70) t.setHSL(0.3, 0.6, 0.5); // Green-ish
        else t.setHSL(0.05, 0.9, 0.5); // Orange/Red
        return t;
    }, [temp]);

    // 2. Distortion (Wind)
    // Higher wind = more speed, more distort
    const distort = Math.min(0.8, Math.max(0.2, wind / 40));
    const speed = Math.max(1, wind / 5);

    // 3. Roughness/Metalness (Precip)
    // Wet = Shiny (High metalness, low roughness)
    // Dry = Matte
    const isWet = precip > 0 || snow > 0;
    const roughness = isWet ? 0.1 : 0.6;
    const metalness = isWet ? 0.8 : 0.2;

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
            meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;

            // Pulse size with temp slightly?
            // meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime) * 0.05);
        }
    });

    return (
        <mesh ref={meshRef}>
            <icosahedronGeometry args={[1.5, 30]} /> {/* High detail for smooth distortion */}
            <MeshDistortMaterial
                color={color}
                envMapIntensity={0.8}
                clearcoat={isWet ? 1 : 0}
                clearcoatRoughness={0}
                metalness={metalness}
                roughness={roughness}
                distort={distort}
                speed={speed}
            />
        </mesh>
    );
};

const SnowParticles = ({ amount }: { amount: number }) => {
    if (amount <= 0) return null;
    return (
        <Sparkles
            count={Math.min(200, amount * 50)}
            scale={5}
            size={2}
            speed={0.4}
            opacity={0.8}
            color="#ffffff"
        />
    );
};

const RainParticles = ({ amount }: { amount: number }) => {
    if (amount <= 0) return null;
    return (
        <Sparkles
            count={Math.min(200, amount * 100)}
            scale={4}
            size={2}
            speed={2}
            opacity={0.6}
            color="#aaddff"
            noise={0.2}
        />
    );
};

export function WeatherFingerprint({ data }: Props) {
    // Get the latest record (Today)
    const latestRecord = data[data.length - 1];

    if (!latestRecord) return <div>No Data for Fingerprint</div>;

    return (
        <div className="fingerprint-container glass-panel">
            <div className="fp-header">
                <h3>Daily Atmospheric Cypher</h3>
                <p>Generating unique data-signature for {latestRecord.Date.toLocaleDateString()}</p>
            </div>

            <div className="canvas-wrapper">
                <div className="fp-stats">
                    <div className="stat-row"><span>TEMP</span> <span className="val">{latestRecord['Avg Temp (°F)']}°F</span></div>
                    <div className="stat-row"><span>WIND</span> <span className="val">{Number(latestRecord['Max Wind Speed (mph)']).toFixed(1)} mph</span></div>
                    <div className="stat-row"><span>PRECIP</span> <span className="val">{latestRecord['Precipitation (in)']} in</span></div>
                    <div className="stat-row"><span>SNOW</span> <span className="val">{latestRecord['Snowfall (in)']} in</span></div>
                </div>

                <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                    <pointLight position={[-10, -10, -10]} intensity={1} />

                    <Suspense fallback={null}>
                        <FingerprintMesh record={latestRecord} />
                        <Environment preset="city" />

                        {(latestRecord['Snowfall (in)'] > 0) && <SnowParticles amount={latestRecord['Snowfall (in)']} />}
                        {(latestRecord['Precipitation (in)'] > 0 && latestRecord['Snowfall (in)'] === 0) && <RainParticles amount={latestRecord['Precipitation (in)']} />}

                    </Suspense>
                    <OrbitControls autoRotate autoRotateSpeed={0.5} enableZoom={false} />
                </Canvas>
            </div>

            <div className="fp-footer">
                <p>The "Shape" of today's weather. Distortion driven by wind shear. Color derived from thermal intensity.</p>
            </div>

            <style jsx>{`
                .fingerprint-container {
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    min-height: 500px;
                }
                .fp-header h3 {
                    color: var(--accent-1);
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }
                .fp-header p {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                .canvas-wrapper {
                    position: relative;
                    flex: 1;
                    background: rgba(0,0,0,0.3);
                    border-radius: 12px;
                    overflow: hidden;
                    min-height: 400px;
                }
                .fp-stats {
                    position: absolute;
                    top: 16px;
                    left: 16px;
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    font-family: var(--font-mono);
                    font-size: 0.8rem;
                }
                .stat-row {
                    display: flex;
                    justify-content: space-between;
                    min-width: 160px; /* Increased to accommodate longer values */
                    background: rgba(0,0,0,0.6); /* Slightly Darker for readability */
                    padding: 6px 10px;
                    border-radius: 4px;
                    border-left: 2px solid var(--accent-1);
                    backdrop-filter: blur(4px);
                }
                .stat-row span {
                    color: var(--text-secondary);
                }
                .stat-row .val {
                    color: var(--text-primary);
                    font-weight: bold;
                }
                .fp-footer {
                    text-align: center;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    font-style: italic;
                }
            `}</style>
        </div>
    );
}
