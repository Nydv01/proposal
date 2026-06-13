uniform float uTime;
uniform float uVisibility;
uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vGlow;

void main() {
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.5);
  float stripe = sin(vUv.y * 80.0 + uTime * 3.0) * 0.5 + 0.5;
  float pulse = sin(uTime * 1.5 + vWorldPos.y * 2.0) * 0.5 + 0.5;

  vec3 base = mix(uColorA, uColorB, stripe);
  base += fresnel * vec3(0.35, 0.85, 0.75) * 0.6;
  base += vGlow * vec3(1.0, 0.45, 0.55) * 0.15;
  base += pulse * 0.04;

  float alpha = (0.35 + fresnel * 0.45 + stripe * 0.12) * uVisibility;
  gl_FragColor = vec4(base, alpha);
}
