'use client'

import { useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { TerminalShader } from '../shaders/TerminalShader'

export const PostProcessor = () => {
    const { gl, scene, camera, size } = useThree()

    const [composer, terminalPass] = useMemo(() => {
        const composer = new EffectComposer(gl)
        composer.addPass(new RenderPass(scene, camera))

        const pass = new ShaderPass(TerminalShader)
        pass.uniforms.uResolution.value = [size.width, size.height]
        composer.addPass(pass)

        return [composer, pass]
    }, [gl, scene, camera, size])

    useFrame((state) => {
        terminalPass.uniforms.uTime.value = state.clock.elapsedTime
        composer.render()
    }, 1)

    return null
}
