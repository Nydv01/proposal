uniform float uTime;
uniform float uTwistAmount;
uniform float uScrollProgress;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vGlow;

void main() {
  vUv = uv;
  vec3 pos = position;

  float twist = uTwistAmount * (0.85 + uScrollProgress * 0.35);
  float k = 0.55;
  pos.x += cos(pos.y * k + uTime * 0.25) * twist;
  pos.z += sin(pos.y * k + uTime * 0.22) * twist;

  pos.x += sin(pos.y * 3.0 + uTime * 1.2) * 0.08;
  pos.z += cos(pos.y * 2.5 + uTime * 1.0) * 0.08;

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(normalMatrix * normal);
  vGlow = 0.5 + 0.5 * sin(pos.y * 4.0 + uTime * 2.0);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
