// Heart fragment shader — SSS, fresnel glow, dissolve
uniform float uTime;
uniform float uPulse;
uniform float uDissolve;
uniform float uFormProgress;
uniform vec3 uBaseColor;    // deep rose
uniform vec3 uGlowColor;   // warm gold
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying float vNoise;
varying vec3 vWorldPosition;

// Simple hash noise for dissolve pattern
float hash(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
  return n;
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  // --- Fresnel (edge glow) ---
  float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
  fresnel = pow(fresnel, 2.5);
  vec3 fresnelColor = mix(vec3(0.85, 0.3, 0.55), vec3(0.6, 0.35, 0.85), fresnel);

  // --- Subsurface scattering approximation ---
  // Light wrapping around edges, simulating translucency
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
  float NdotL = dot(normal, lightDir);
  float sss = smoothstep(-0.3, 1.0, NdotL); // wide light wrap
  float backScatter = max(0.0, dot(-normal, lightDir)) * 0.4;
  float translucency = sss + backScatter;

  // --- Base color with SSS ---
  vec3 baseCol = uBaseColor;
  vec3 sssColor = mix(baseCol, uGlowColor, 0.35); // gold-tinted subsurface
  vec3 litColor = mix(baseCol * 0.3, sssColor, translucency);

  // --- Golden rim light ---
  float rimDot = 1.0 - max(dot(normal, viewDir), 0.0);
  float rim = pow(rimDot, 3.5);
  vec3 rimColor = uGlowColor * rim * 0.6;

  // --- Pulsing emission (heartbeat) ---
  float pulse = sin(uPulse * 6.283185) * 0.5 + 0.5;
  float pulseGlow = pulse * 0.35;
  vec3 emissive = uBaseColor * pulseGlow * 1.2;

  // --- Combine lighting ---
  vec3 color = litColor + rimColor + emissive;
  color += fresnelColor * fresnel * 0.45;

  // Subtle noise-based color variation for organic feel
  float nVar = vNoise * 0.1;
  color += vec3(nVar * 0.5, nVar * 0.2, nVar * 0.4);

  // --- Dissolve effect ---
  float alpha = uOpacity;
  if (uDissolve > 0.001) {
    float dissolveNoise = noise3D(vPosition * 3.5 + uTime * 0.3);
    float dissolveEdge = smoothstep(uDissolve - 0.08, uDissolve, dissolveNoise);
    float edgeGlow = smoothstep(uDissolve - 0.12, uDissolve - 0.02, dissolveNoise)
                   - smoothstep(uDissolve - 0.02, uDissolve + 0.04, dissolveNoise);

    // Bright glow at dissolve boundary
    color += vec3(1.0, 0.7, 0.3) * edgeGlow * 3.0;
    alpha *= dissolveEdge;
  }

  // Formation fade
  alpha *= smoothstep(0.0, 0.15, uFormProgress);

  gl_FragColor = vec4(color, alpha);
}
