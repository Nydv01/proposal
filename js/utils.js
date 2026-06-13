/**
 * Utility functions for the cinematic proposal experience
 */

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  return clamp(
    ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin,
    Math.min(outMin, outMax),
    Math.max(outMin, outMax)
  );
}

export function throttle(fn, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function isMobile() {
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function random(min, max) {
  return Math.random() * (max - min) + min;
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 } : null;
}

export function getGPUTier() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'low';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'medium';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    if (renderer.includes('swiftshader') || renderer.includes('software') || renderer.includes('llvmpipe') || renderer.includes('mali-t') || renderer.includes('adreno (tm) 3') || renderer.includes('adreno (tm) 4') || renderer.includes('intel hd graphics')) return 'low';
    if (renderer.includes('nvidia') || renderer.includes('geforce') || renderer.includes('radeon') || renderer.includes('amd') || renderer.includes('apple gpu') || renderer.includes('apple m') || renderer.includes('adreno (tm) 6') || renderer.includes('adreno (tm) 7') || renderer.includes('mali-g7')) return 'high';
    return 'medium';
  } catch (e) {
    return 'low';
  }
}

export class Timer {
  constructor() {
    this.startTime = performance.now();
    this.oldTime = this.startTime;
    this.elapsedTime = 0;
  }

  getDelta() {
    const newTime = performance.now();
    const diff = (newTime - this.oldTime) / 1000;
    this.oldTime = newTime;
    return diff;
  }

  getElapsedTime() {
    const newTime = performance.now();
    this.elapsedTime = (newTime - this.startTime) / 1000;
    return this.elapsedTime;
  }
}

