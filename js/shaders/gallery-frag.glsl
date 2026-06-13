uniform sampler2D uTexture;
uniform vec2 uMouse;
uniform float uHover;
uniform float uVelocity;
uniform float uTime;
uniform float uZoomProgress;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Calculate distance from cursor mapping coordinates
  float dist = distance(uv, uMouse);

  // Generate fluid wave displacement
  // Scale ripple frequency and decay parameters
  float wave = sin(dist * 25.0 - uTime * 6.0) * exp(-dist * 4.5);
  
  // Calculate distortion intensity, fading to zero as uZoomProgress reaches 1
  float distortionStrength = uHover * uVelocity * 0.08 * (1.0 - uZoomProgress);
  
  // Apply UV displacement vector
  vec2 displacedUv = uv + normalize(uv - uMouse) * wave * distortionStrength;
  
  // Keep coordinates clamped within [0, 1] range to avoid edge artifacts
  displacedUv = clamp(displacedUv, 0.0, 1.0);

  // Sample primary texture
  vec4 color = texture2D(uTexture, displacedUv);

  // Add a soft vignette or highlight overlay when hovered / zoomed
  float hoverOverlay = (1.0 - smoothstep(0.0, 0.6, dist)) * 0.06 * uHover * (1.0 - uZoomProgress);
  color.rgb += vec3(hoverOverlay);

  gl_FragColor = color;
}
