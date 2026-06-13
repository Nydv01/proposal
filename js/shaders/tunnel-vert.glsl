uniform float uTime;
uniform float uHover;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vec3 pos = position;

  // Gentle wave sway along the local Z-axis (organic card movement)
  // Ripple amplifies based on mouse hover state
  float wave = sin(pos.y * 2.0 + uTime * 1.5) * 0.035 + cos(pos.x * 2.2 + uTime * 1.2) * 0.025;
  pos.z += wave * (1.0 + uHover * 2.0);

  // Apply standard vertex transforms
  vPosition = pos;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
