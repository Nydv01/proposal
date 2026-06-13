uniform float uTime;
uniform float uScrollProgress;
uniform vec2 uMousePos;
uniform float uMouseRadius;
uniform float uHelixRadius;
uniform float uHelixHeight;
uniform float uTurns;

attribute float aHelixPhase;
attribute float aHelixStrand; // 0 = Strand A, 1 = Strand B, 2 = Rung, 3 = Stardust Core
attribute float aRandomSeed;
attribute vec3 aTargetPosition;
attribute vec3 aCustomColor;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aCustomColor;
  
  float seed = aRandomSeed;
  
  // 1. Calculate Helix Strand A position
  float thetaA = aHelixPhase * uTurns * 6.283185 + uTime * 0.4;
  float r = uHelixRadius + sin(uTime * 1.0 + aHelixPhase * 10.0 + seed * 6.28) * 0.12;
  
  vec3 posA = vec3(
    r * cos(thetaA),
    (aHelixPhase - 0.5) * uHelixHeight,
    r * sin(thetaA)
  );
  
  // 2. Calculate Helix Strand B position (offset by PI)
  float thetaB = thetaA + 3.1415926;
  vec3 posB = vec3(
    r * cos(thetaB),
    (aHelixPhase - 0.5) * uHelixHeight,
    r * sin(thetaB)
  );
  
  // 3. Determine base particle position based on strand type
  vec3 basePos;
  
  if (aHelixStrand < 0.5) {
    // Strand A
    basePos = posA;
  } else if (aHelixStrand < 1.5) {
    // Strand B
    basePos = posB;
  } else if (aHelixStrand < 2.5) {
    // Connecting Rung: interpolate between A and B
    basePos = mix(posA, posB, seed);
    vColor = mix(vColor, vec3(1.0, 0.85, 0.4), 0.4); // Add golden tone to rungs
  } else {
    // Stardust Core: dense particles inside the center of the helix
    float thetaCore = seed * 6.283185 + uTime * 0.25;
    float rCore = seed * 2.2; // dense center
    basePos = vec3(
      rCore * cos(thetaCore),
      (aHelixPhase - 0.5) * uHelixHeight,
      rCore * sin(thetaCore)
    );
    // Give stardust core particles a bright pink/teal mix
    vColor = mix(vColor, vec3(0.95, 0.35, 0.65), seed * 0.5);
  }
  
  // Wave wobble
  basePos.x += sin(uTime * 1.2 + aHelixPhase * 15.0 + seed * 6.28) * 0.15;
  basePos.y += cos(uTime * 0.8 + aHelixPhase * 10.0 + seed * 6.28) * 0.1;
  basePos.z += sin(uTime * 1.0 + seed * 6.28) * 0.15;
  
  // Morph to 3D Heart earlier so it becomes clearly visible in-center.
  float morphFactor = smoothstep(0.62, 0.96, uScrollProgress);
  vec3 morphPosition = mix(basePos, aTargetPosition, morphFactor);

  // Mouse repulsion
  vec4 worldPos = modelMatrix * vec4(morphPosition, 1.0);
  vec2 particleScreen = worldPos.xy;
  float distToCursor = length(particleScreen - uMousePos * 25.0);
  float repulsion = smoothstep(uMouseRadius, 0.0, distToCursor) * 3.5;
  vec2 pushDir = normalize(particleScreen - uMousePos * 25.0 + 0.001);
  morphPosition.xy += pushDir * repulsion;

  // Projection
  vec4 mvPosition = modelViewMatrix * vec4(morphPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size calculation
  float baseSize = 40.0 + sin(seed * 100.0) * 15.0;
  
  // Stardust core particles are slightly smaller for a misty/dense nebula feel
  if (aHelixStrand > 2.5) {
    baseSize *= 0.75;
  }
  
  vAlpha = smoothstep(0.0, 0.15, uScrollProgress) * 0.95 + 0.05;
  gl_PointSize = (baseSize * (1.0 + morphFactor * 0.35)) / -mvPosition.z;
}
