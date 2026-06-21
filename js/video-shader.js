/**
 * video-shader.js — Dynamic, pixelated particle mosaic WebGL shader animation
 * that renders around/behind the video card to create a cinematic portal aura.
 */
import * as THREE from 'three';

export class VideoShader {
  constructor(container) {
    if (!container) return;
    this.container = container;
    this.animationId = null;
    this.isActive = false;

    this.init();
  }

  init() {
    // Clear container
    this.container.innerHTML = '';

    // Initialize camera (identity camera mapping Plane to NDC)
    this.camera = new THREE.Camera();
    this.camera.position.z = 1;

    // Initialize scene
    this.scene = new THREE.Scene();

    // Create 2x2 plane covering NDC viewport
    this.geometry = new THREE.PlaneGeometry(2, 2);

    // Uniforms matching fragment shader needs
    this.uniforms = {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2() },
    };

    // Simple vertex shader mapping coordinates
    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // High-fidelity mosaic pulse fragment shader (user-provided circular waves)
    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;
        
      float random (in float x) {
          return fract(sin(x)*1e4);
      }
      float random (vec2 st) {
          return fract(sin(dot(st.xy,
                               vec2(12.9898,78.233)))*
              43758.5453123);
      }

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        
        vec2 fMosaicScal = vec2(4.0, 2.0);
        vec2 vScreenSize = vec2(256.0, 256.0);
        uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
        uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);       
          
        float t = time * 0.07 + random(uv.x) * 0.4;
        float lineWidth = 0.0008;

        vec3 color = vec3(0.0);
        for(int j = 0; j < 3; j++){
          for(int i = 0; i < 5; i++){
            // Shift the wave path to start at 0.55 (just at the card edge) and go to 1.30.
            // This eliminates the 4-second "dead zone" behind the video card, making waves reappear instantly.
            float wavePos = 0.55 + fract(t - 0.01 * float(j) + float(i) * 0.012) * 0.75;
            color[j] += lineWidth * float(i*i) / (abs(wavePos - length(uv)) + 0.018);        
          }
        }

        // Apply a cinematic, soothing rose gold palette (love touch, intimate feeling)
        vec3 rosegold = vec3(0.85, 0.58, 0.54);  // Soft, desaturated Rose Gold
        vec3 champagne = vec3(0.88, 0.70, 0.58); // Muted, warm Champagne Gold
        vec3 sunset = vec3(0.55, 0.20, 0.28);    // Deep Intimate Rose Shadow

        // Combine chromatic aberration waves into a rich, soft glow
        vec3 finalColor = color[0] * rosegold + color[1] * champagne + color[2] * sunset;
        finalColor *= 0.35; // Scale down the brightness to keep it gentle and soothing

        // Add a soft base glow so it never fades to complete black
        vec3 baseGlow = sunset * 0.05 * (1.0 - length(uv) * 0.6);
        finalColor += baseGlow;

        float alpha = max(max(finalColor.r, finalColor.g), finalColor.b);
        alpha = clamp(alpha * 1.2, 0.22, 1.0); // Clamp minimum alpha to 0.22 so it never goes completely off
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    // Create custom shader material
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      depthWrite: false,
      depthTest: false
    });

    // Create mesh and add to scene
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    // Initialize WebGL renderer with alpha (optimized pixel ratio for background shader)
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(1.0);
    this.container.appendChild(this.renderer.domElement);

    // Handle initial resize
    this.onResize();

    // Bind event handlers
    this.resizeHandler = this.onResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
  }

  onResize() {
    if (!this.container || !this.renderer) return;

    const rect = this.container.getBoundingClientRect();
    const width = rect.width || 680;
    const height = rect.height || 382;

    this.renderer.setSize(width, height);
    this.uniforms.resolution.value.x = this.renderer.domElement.width;
    this.uniforms.resolution.value.y = this.renderer.domElement.height;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.animate();
  }

  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate() {
    if (!this.isActive) return;

    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    // Smooth, gradual update of time uniform
    this.uniforms.time.value += 0.05;
    
    // Render frame
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resizeHandler);
    
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
