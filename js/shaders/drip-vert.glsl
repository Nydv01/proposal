uniform float uTime;
uniform float uScrollProgress;
uniform vec2 uMousePos;
uniform float uMouseStrength;
uniform float uHelixRadius;
uniform float uHelixHeight;
uniform float uTurns;
uniform float uSceneIntro;

attribute float aRandomSeed;
attribute float aDripSpeed;
attribute float aOrbitPhase;
attribute vec3 aCustomColor;
attribute float aLayer; // 0 = ambient cloud, 1 = helix stream, 2 = edge dribble

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aCustomColor;
  float seed = aRandomSeed;
  float introFade = smoothstep(0.0, 0.12, uScrollProgress);
  float helixBoost = smoothstep(0.08, 0.45, uScrollProgress) * (1.0 - smoothstep(0.78, 0.92, uScrollProgress));

  vec3 pos;

  if (aLayer < 0.5) {
    float spread = 28.0 + seed * 12.0;
    pos = vec3(
      (seed - 0.5) * spread * 2.0,
      mod(seed * 80.0 - uTime * (1.2 + aDripSpeed * 3.0), 55.0) - 27.0,
      (fract(seed * 91.7) - 0.5) * spread
    );
    pos.x += sin(uTime * 0.7 + seed * 40.0) * 0.8;
    pos *= 0.35 + introFade * 0.65;
  } else if (aLayer < 1.5) {
    float theta = aOrbitPhase * uTurns * 6.283185 + uTime * 0.35;
    float r = uHelixRadius + sin(uTime * 1.4 + seed * 18.0) * 0.35;
    float y = (aOrbitPhase - 0.5) * uHelixHeight;
    pos = vec3(r * cos(theta), y, r * sin(theta));
    pos.x += cos(y * 0.52) * 2.2;
    pos.z += sin(y * 0.52) * 2.2;
    pos.y -= uTime * aDripSpeed * 0.35;
    pos.y = mod(pos.y + uHelixHeight * 0.5, uHelixHeight) - uHelixHeight * 0.5;
  } else {
    float edge = step(0.5, fract(seed * 3.1));
    float xSpread = (seed - 0.5) * uHelixRadius * 2.5;
    float yStart = edge > 0.5 ? uHelixHeight * 0.55 : -uHelixHeight * 0.55;
    pos = vec3(
      xSpread + uMousePos.x * 4.0,
      yStart - uTime * (2.5 + aDripSpeed * 5.0),
      sin(seed * 50.0) * 3.0
    );
    pos.y = mod(pos.y + uHelixHeight * 0.5, uHelixHeight) - uHelixHeight * 0.5;
  }

  vec4 world = modelMatrix * vec4(pos, 1.0);
  float mouseDist = length(world.xy - uMousePos * 22.0);
  float push = smoothstep(5.0, 0.0, mouseDist) * uMouseStrength;
  pos.xy += normalize(world.xy - uMousePos * 22.0 + 0.001) * push;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float sizeBase = 28.0 + seed * 22.0;
  if (aLayer > 1.5) sizeBase *= 1.35;
  sizeBase *= 0.4 + introFade * 0.6 + helixBoost * 0.5;

  vAlpha = (0.25 + introFade * 0.55 + helixBoost * 0.35) * (0.7 + seed * 0.3);
  gl_PointSize = sizeBase / -mvPosition.z;
}
