'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { TerminalGlobe } from './TerminalGlobe'
import { PostProcessor } from './PostProcessor'
import { useState, useEffect, Suspense } from 'react'
import { Radio, Terminal as TerminalIcon } from 'lucide-react'

export function SatelliteHeader() {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="w-full h-[300px] relative bg-black font-mono overflow-hidden border-b border-[#00ff4166]">
            {/* Background Layer: Three.js */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 1, 5], fov: 35 }}>
                    <color attach="background" args={['#000']} />
                    <ambientLight intensity={1.5} />
                    {/* Shift the globe slightly down to center it in the banner better */}
                    <group position={[0, -0.5, 0]}>
                        <Suspense fallback={null}>
                            <TerminalGlobe />
                        </Suspense>
                    </group>
                    <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
                    <OrbitControls enablePan={false} enableZoom={false} />
                    <PostProcessor />
                </Canvas>
            </div>


            {/* CRT Shadow/Scanline effect for the banner */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] z-20"></div>
        </div>
    )
}
