uniform vec3 uColor;
uniform float uTime;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Simplex-like noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  // Base warm kraft paper color
  vec3 paperColor = uColor;
  
  // 1. High-frequency paper fibers
  float grain = fbm(vUv * 1200.0) * 0.07;
  float largeGrain = fbm(vUv * 60.0) * 0.04;
  
  // Leather-like noise wrinkles
  float wrinkles = noise(vUv * 8.0) * 0.03;
  paperColor += vec3(grain + largeGrain - wrinkles);
  
  // 2. Animated warm candle-light caustics
  float flicker = sin(uTime * 3.2) * 0.015 + cos(uTime * 6.5) * 0.01 + sin(uTime * 0.9) * 0.02;
  vec2 causticUv = vUv * 10.0 + vec2(uTime * 0.1, sin(uTime * 0.05) * 0.1);
  float caustics = fbm(causticUv) * 0.06 + flicker * 0.8;
  
  // Make caustics warmer (yellow/orange tint)
  paperColor += vec3(caustics * 1.1, caustics * 0.95, caustics * 0.6);
  
  // 3. Vignette and center-lighting
  float centerDist = length(vUv - 0.5);
  paperColor += vec3(0.03, 0.01, -0.01) * (1.0 - centerDist);

  // Directional lighting
  vec3 lightDir = normalize(vec3(4.0, 4.0, 7.0));
  float diff = max(dot(vNormal, lightDir), 0.0);
  
  float vignette = smoothstep(0.8, 0.15, centerDist);
  paperColor *= (diff * 0.35 + 0.65) * (vignette * 0.25 + 0.75);

  gl_FragColor = vec4(paperColor, uOpacity);
}
