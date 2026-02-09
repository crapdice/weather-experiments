export const TerminalShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uResolution: { value: [0, 0] },
        uGreenTint: { value: [0.0, 1.0, 0.25] }, // Classic Phosphor Green
    },
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec3 uGreenTint;
    varying vec2 vUv;

    // Noise function for flicker
    float noise(vec2 co) {
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
      // 1. Sample the original texture
      vec4 color = texture2D(tDiffuse, vUv);
      
      // 2. Convert to Grayscale (Luminance)
      float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      
      // 3. Apply Green Tint based on luminance
      vec3 greenBase = luminance * uGreenTint;
      
      // 4. Scanlines
      float scanline = sin(vUv.y * uResolution.y * 1.5) * 0.1;
      greenBase -= scanline;
      
      // 5. Vertical Dithering / Grit
      float grit = noise(vUv + floor(uTime * 10.0)) * 0.05;
      greenBase += grit;

      // 6. Slow Flicker
      float flicker = 0.98 + 0.02 * sin(uTime * 100.0);
      greenBase *= flicker;

      // 7. Vignette
      float dist = distance(vUv, vec2(0.5));
      greenBase *= smoothstep(0.8, 0.2, dist);

      // 8. Bloom/Glow hint (boost brightness of the brights slightly)
      greenBase += pow(luminance, 3.0) * 0.2 * uGreenTint;

      gl_FragColor = vec4(greenBase, 1.0);
    }
  `
};
