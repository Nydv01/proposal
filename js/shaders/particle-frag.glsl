varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  
  if (dist > 0.5) discard;

  // Core glow - bright center
  float core = smoothstep(0.5, 0.0, dist);
  // Outer halo - soft extended glow
  float halo = smoothstep(0.5, 0.1, dist) * 0.6;
  
  float alpha = (core + halo) * vAlpha;
  vec3 finalColor = vColor + vec3(core * 0.3); // Brighten core
  
  gl_FragColor = vec4(finalColor, alpha);
}
