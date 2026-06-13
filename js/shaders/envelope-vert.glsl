uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  // Subtle paper breathing displacement
  float displacement = sin(position.y * 3.0 + uTime * 1.5) * 0.03;
  displacement += sin(position.x * 2.5 + uTime * 1.2) * 0.02;
  vec3 newPos = position + normal * displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
