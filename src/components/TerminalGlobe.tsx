'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, useTexture, Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

export function TerminalGlobe() {
    const meshRef = useRef<THREE.Mesh>(null)
    const cloudsRef = useRef<THREE.Mesh>(null)
    const texture = useTexture('/earth_mask.png')

    useFrame((_state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.002
        }
        if (cloudsRef.current) {
            cloudsRef.current.rotation.y += 0.003
            cloudsRef.current.rotation.x += 0.001
        }
    })

    // Create some "satellite" points orbiting the globe
    const [satPoints] = useMemo(() => {
        const count = 50
        const points = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            const r = 2.2 + Math.random() * 0.5
            const theta = Math.random() * Math.PI * 2
            const phi = Math.random() * Math.PI - Math.PI / 2
            points[i * 3] = r * Math.cos(phi) * Math.cos(theta)
            points[i * 3 + 1] = r * Math.sin(phi)
            points[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta)
        }
        return [points]
    }, [])

    return (
        <group>
            {/* The main Earth */}
            <Sphere ref={meshRef} args={[2, 64, 64]}>
                <meshBasicMaterial
                    map={texture}
                    transparent={true}
                    opacity={0.8}
                />
            </Sphere>

            {/* Grid Overlay on Sphere */}
            <Sphere args={[2.01, 32, 32]}>
                <meshBasicMaterial
                    color="#00ff41"
                    wireframe
                    transparent
                    opacity={0.15}
                />
            </Sphere>

            {/* Orbiting Satellites / Data points */}
            <Points positions={satPoints}>
                <PointMaterial
                    transparent
                    color="#00ff41"
                    size={0.05}
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </Points>

            {/* Atmosphere Glow effect */}
            <Sphere args={[2.05, 64, 64]}>
                <meshBasicMaterial
                    color="#00ff41"
                    side={THREE.BackSide}
                    transparent
                    opacity={0.1}
                />
            </Sphere>
        </group>
    )
}
