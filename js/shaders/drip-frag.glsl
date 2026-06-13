varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;

  float core = smoothstep(0.5, 0.0, d);
  float streak = smoothstep(0.5, 0.15, abs(c.x) + d * 0.35);
  float alpha = (core * 0.85 + streak * 0.35) * vAlpha;

  vec3 col = vColor + vec3(core * 0.45);
  gl_FragColor = vec4(col, alpha);
}
