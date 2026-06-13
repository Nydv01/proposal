uniform sampler2D uTexture;
uniform float uHasTexture;
uniform float uIsVideo;
uniform float uHover;
uniform float uOpacity;
uniform float uTime;
uniform vec3 uGlowColor;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec2 uv = vUv;
  
  // 1. Continuous fluid wave ripple coordinates displacement (Active Theory style)
  if (uIsVideo > 0.5) {
    uv.x += sin(uv.y * 8.0 + uTime * 1.5) * 0.0035;
    uv.y += cos(uv.x * 6.0 + uTime * 1.2) * 0.0025;
    
    // Wave ripple intensifies on cursor hover
    if (uHover > 0.01) {
      uv.x += sin(uv.y * 22.0 + uTime * 4.5) * 0.008 * uHover;
      uv.y += cos(uv.x * 18.0 + uTime * 4.0) * 0.006 * uHover;
    }
  }

  // 2. RGB Split (Chromatic Aberration) holographic channel shifts
  vec4 color = vec4(0.0);
  if (uHasTexture > 0.5) {
    if (uIsVideo > 0.5 && uHover > 0.01) {
      float splitDist = 0.004 + uHover * 0.012;
      vec2 redUv = uv + vec2(splitDist * sin(uTime * 4.0), 0.0);
      vec2 blueUv = uv - vec2(splitDist * cos(uTime * 3.5), 0.0);
      
      color.r = texture2D(uTexture, redUv).r;
      color.g = texture2D(uTexture, uv).g;
      color.b = texture2D(uTexture, blueUv).b;
      color.a = texture2D(uTexture, uv).a;
    } else {
      color = texture2D(uTexture, uv);
    }
  } else {
    color = vec4(uGlowColor * 0.35 + vec3(0.06, 0.05, 0.12), 1.0);
  }

  // 3. VHS Scanlines and Digital tracking noise overlay
  if (uIsVideo > 0.5) {
    float scanline = sin(uv.y * 380.0 + uTime * 6.0) * 0.035;
    color.rgb += vec3(scanline);
    
    // CRT Grain
    float grain = fract(sin(dot(uv * (uTime + 1.0), vec2(12.9898, 78.233))) * 43758.5453);
    color.rgb += vec3((grain - 0.5) * 0.045);
    
    // CRT Flicker simulation
    float flicker = 0.97 + 0.03 * sin(uTime * 45.0) * cos(uTime * 25.0);
    color.rgb *= flicker;
  }

  // 4. Vignette shading
  float borderDistX = min(uv.x, 1.0 - uv.x);
  float borderDistY = min(uv.y, 1.0 - uv.y);
  float vignette = smoothstep(0.0, 0.15, borderDistX) * smoothstep(0.0, 0.15, borderDistY);
  vignette = mix(0.38, 1.0, vignette);
  color.rgb *= vignette;

  // 5. Pulsing holographic border neon glow
  float borderX = smoothstep(0.05, 0.0, borderDistX);
  float borderY = smoothstep(0.05, 0.0, borderDistY);
  float borderFactor = max(borderX, borderY);
  
  float pulse = 1.0 + 0.15 * sin(uTime * 3.0);
  vec3 borderGlow = uGlowColor * borderFactor * (0.35 + uHover * 1.6) * pulse;
  color.rgb += borderGlow;

  // 6. Hover swell brightness
  color.rgb = mix(color.rgb, color.rgb * 1.15 + vec3(0.03), uHover * 0.2);

  gl_FragColor = vec4(color.rgb, uOpacity);
}

