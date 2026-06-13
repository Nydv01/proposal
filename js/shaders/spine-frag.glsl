varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  
  if (dist > 0.5) discard;

  // Inner bright core
  float core = smoothstep(0.5, 0.0, dist);
  // Outer soft glow halo
  float halo = smoothstep(0.5, 0.15, dist) * 0.7;
  
  float alpha = (core + halo) * vAlpha;
  
  // Brighten center of particle core
  vec3 finalColor = vColor + vec3(core * 0.4);
  
  gl_FragColor = vec4(finalColor, alpha);
}
