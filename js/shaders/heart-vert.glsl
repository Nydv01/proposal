// Heart vertex shader — pulse, wave, noise displacement
uniform float uTime;
uniform float uPulse;       // 0-1 heartbeat phase
uniform float uProgress;    // scroll 0-1
uniform float uFormProgress; // 0-1 formation
uniform float uDissolve;    // 0-1 dissolve

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying float vNoise;
varying vec3 vWorldPosition;

// Simple 3D noise (hash-based)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - 0.5;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec4 j = p - 49.0 * floor(p * (1.0 / 49.0));
  vec4 x_ = floor(j * (1.0 / 7.0));
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x2_ = (x_ * 2.0 + 0.5) / 7.0 - 1.0;
  vec4 y2_ = (y_ * 2.0 + 0.5) / 7.0 - 1.0;
  vec4 h = 1.0 - abs(x2_) - abs(y2_);
  vec4 b0 = vec4(x2_.xy, y2_.xy);
  vec4 b1 = vec4(x2_.zw, y2_.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 g0 = vec3(a0.xy, h.x);
  vec3 g1 = vec3(a0.zw, h.y);
  vec3 g2 = vec3(a1.xy, h.z);
  vec3 g3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g0, g0), dot(g1, g1), dot(g2, g2), dot(g3, g3)));
  g0 *= norm.x; g1 *= norm.y; g2 *= norm.z; g3 *= norm.w;
  float n = 42.0 * (
    dot(max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0)
        * max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0)
        * max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0),
    vec4(dot(g0, x0), dot(g1, x1), dot(g2, x2), dot(g3, x3)))
  );
  return n;
}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec3 pos = position;

  // Organic noise displacement
  float noiseVal = snoise(pos * 1.8 + uTime * 0.3);
  vNoise = noiseVal;

  // Heartbeat pulse: expand along normals
  float pulse = sin(uPulse * 6.283185) * 0.5 + 0.5;
  float pulseDisp = pulse * 0.08;
  pos += normal * pulseDisp;

  // Subtle wave motion
  pos.x += sin(uTime * 1.5 + pos.y * 2.0) * 0.015;
  pos.y += cos(uTime * 1.2 + pos.x * 2.0) * 0.012;
  pos.z += sin(uTime * 1.0 + pos.z * 1.5) * 0.01;

  // Noise-based organic displacement
  pos += normal * noiseVal * 0.04;

  // Formation: scatter outward when not yet formed
  float scatter = 1.0 - uFormProgress;
  vec3 scatterDir = normalize(pos + vec3(noiseVal * 0.5));
  pos += scatterDir * scatter * 4.0;

  // Dissolve: push vertices outward with noise
  float dissolveNoise = snoise(pos * 2.0 + uTime * 0.5);
  pos += normal * uDissolve * dissolveNoise * 3.0;
  pos.y -= uDissolve * 1.5; // drift downward

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;
  vPosition = pos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
