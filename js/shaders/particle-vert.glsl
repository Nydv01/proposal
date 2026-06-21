uniform float uTime;
uniform float uScrollProgress;
uniform vec2 uMousePos;
uniform float uMouseRadius;
uniform float uPortalDiveProgress;

attribute vec3 aTargetPosition;
attribute vec3 aTargetPositionInitials;
attribute vec3 aTargetPositionRing;
attribute vec3 aCustomColor;
attribute float aRandomSeed;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aCustomColor;
  
  // Calculate multi-stage morph coordinates on the GPU
  vec3 morphPosition;
  if (uScrollProgress <= 0.45) {
    // Stage 1: Sphere to Heart (morph between 0.10 and 0.25, hold Heart until 0.45)
    float t = smoothstep(0.10, 0.25, uScrollProgress);
    morphPosition = mix(position, aTargetPosition, t);
  } else if (uScrollProgress <= 0.78) {
    // Stage 2: Heart to Initials "N ♥ K" (morph between 0.45 and 0.58, hold Initials until 0.78)
    float t = smoothstep(0.45, 0.58, uScrollProgress);
    morphPosition = mix(aTargetPosition, aTargetPositionInitials, t);
  } else {
    // Stage 3: Initials to Climax Heart (morph between 0.78 and 0.90, hold Climax Heart until 1.00)
    float t = smoothstep(0.78, 0.90, uScrollProgress);
    morphPosition = mix(aTargetPositionInitials, aTargetPositionRing, t);
  }

  // Vortex warp transition when diving into a portal
  if (uPortalDiveProgress > 0.0) {
    float d = length(morphPosition.xy);
    float angle = uPortalDiveProgress * 8.5 * (1.0 / (d * 0.12 + 0.45));
    float s = sin(angle);
    float c = cos(angle);
    vec2 rotated = vec2(
      morphPosition.x * c - morphPosition.y * s,
      morphPosition.x * s + morphPosition.y * c
    );
    morphPosition.xy = mix(morphPosition.xy, rotated, uPortalDiveProgress);
    morphPosition.z += uPortalDiveProgress * 55.0 * (1.0 - aRandomSeed);
  }

  // Evolving floating wave fluctuations using simplex-like multi-frequencies
  float seed = aRandomSeed;
  morphPosition.y += sin(uTime * 1.3 + position.x * 0.04 + seed * 6.28) * 0.6;
  morphPosition.x += cos(uTime * 0.9 + position.y * 0.04 + seed * 3.14) * 0.5;
  morphPosition.z += sin(uTime * 0.7 + seed * 12.56) * 0.4;

  // Particle cursor repulsion
  vec4 worldPos = modelMatrix * vec4(morphPosition, 1.0);
  vec2 particleScreen = worldPos.xy;
  float distToCursor = length(particleScreen - uMousePos * 25.0);
  float repulsion = smoothstep(uMouseRadius, 0.0, distToCursor) * 3.5;
  vec2 pushDir = normalize(particleScreen - uMousePos * 25.0 + 0.001);
  morphPosition.xy += pushDir * repulsion;

  vec4 mvPosition = modelViewMatrix * vec4(morphPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size calculations with depth-attenuation properties
  float baseSize = 45.0 + sin(seed * 120.0) * 15.0;
  vAlpha = smoothstep(0.0, 0.25, uScrollProgress) * 0.9 + 0.1;
  gl_PointSize = baseSize / -mvPosition.z;
}
