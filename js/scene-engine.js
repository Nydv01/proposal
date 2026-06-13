/**
 * scene-engine.js — Central scene coordinator for the cinematic experience.
 * Manages scene lifecycle, transitions, scroll mapping, and cross-system communication.
 * 
 * Architecture:
 * - Each scene is a full-screen pinned section driven by GSAP ScrollTrigger
 * - Scroll position maps to scene index + intra-scene progress (0-1)
 * - The engine coordinates 3D canvas, audio, DOM overlays, and particles per scene
 * - Supports cinematic transitions between scenes (crossfade, wipe, blur)
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scene configuration structure:
 * {
 *   id: string,           // matches data-scene attribute
 *   element: HTMLElement,  // the section DOM element
 *   duration: number,      // scroll distance in vh (e.g., 300 = 3 viewport heights)
 *   onEnter: (direction) => void,
 *   onLeave: (direction) => void,
 *   onProgress: (progress, direction) => void,  // progress 0-1 within scene
 *   audioMood: string,     // mood key for audio engine
 * }
 */

export class SceneEngine {
  constructor({ onSceneChange, onGlobalProgress }) {
    this.scenes = [];
    this.activeScene = null;
    this.activeIndex = -1;
    this.globalProgress = 0;
    this.onSceneChange = onSceneChange || (() => {});
    this.onGlobalProgress = onGlobalProgress || (() => {});
    this.scrollTriggers = [];
    this.isReady = false;
  }

  /**
   * Register a scene with configuration
   */
  registerScene(config) {
    const scene = {
      id: config.id,
      element: config.element || document.querySelector(`[data-scene="${config.id}"]`),
      duration: config.duration || 200,    // vh
      onEnter: config.onEnter || (() => {}),
      onLeave: config.onLeave || (() => {}),
      onProgress: config.onProgress || (() => {}),
      audioMood: config.audioMood || 'ambient',
      phase: config.phase || config.id,
    };
    
    if (!scene.element) {
      console.warn(`[SceneEngine] No element found for scene: ${config.id}`);
      return;
    }

    this.scenes.push(scene);
    return scene;
  }

  /**
   * Initialize all scroll triggers and scene tracking
   */
  init() {
    if (!this.scenes.length) {
      console.warn('[SceneEngine] No scenes registered');
      return;
    }

    // Set up each scene with ScrollTrigger pinning and progress tracking
    this.scenes.forEach((scene, index) => {
      // Set the scroll height for each scene
      scene.element.style.minHeight = `${scene.duration}vh`;

      const trigger = ScrollTrigger.create({
        trigger: scene.element,
        start: 'top top',
        end: `+=${scene.duration}vh`,
        pin: true,
        pinSpacing: true,
        scrub: 0.5,
        onEnter: () => this._onSceneEnter(scene, index, 'down'),
        onEnterBack: () => this._onSceneEnter(scene, index, 'up'),
        onLeave: () => this._onSceneLeave(scene, index, 'down'),
        onLeaveBack: () => this._onSceneLeave(scene, index, 'up'),
        onUpdate: (self) => {
          scene.onProgress(self.progress, self.direction);
          this._updateGlobalProgress();
        },
      });

      this.scrollTriggers.push(trigger);
    });

    // Global progress tracker
    ScrollTrigger.create({
      trigger: document.getElementById('smooth-content'),
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        this.globalProgress = self.progress;
        this.onGlobalProgress(self.progress);
      },
    });

    this.isReady = true;
  }

  /**
   * Navigate to a specific scene by id
   */
  goToScene(sceneId) {
    const index = this.scenes.findIndex(s => s.id === sceneId);
    if (index === -1) return;

    const trigger = this.scrollTriggers[index];
    if (trigger) {
      gsap.to(window, {
        scrollTo: { y: trigger.start, autoKill: false },
        duration: 1.5,
        ease: 'power3.inOut',
      });
    }
  }

  /**
   * Get current scene progress (0-1)
   */
  getCurrentProgress() {
    if (this.activeIndex >= 0 && this.scrollTriggers[this.activeIndex]) {
      return this.scrollTriggers[this.activeIndex].progress;
    }
    return 0;
  }

  /**
   * Internal: handle scene entry
   */
  _onSceneEnter(scene, index, direction) {
    const prevScene = this.activeScene;
    this.activeScene = scene;
    this.activeIndex = index;

    scene.onEnter(direction);
    this.onSceneChange({
      current: scene,
      previous: prevScene,
      index,
      direction,
      phase: scene.phase,
    });

    // Dispatch custom event for other systems
    window.dispatchEvent(new CustomEvent('scene-change', {
      detail: { sceneId: scene.id, index, direction, phase: scene.phase }
    }));
  }

  /**
   * Internal: handle scene exit
   */
  _onSceneLeave(scene, index, direction) {
    scene.onLeave(direction);
  }

  /**
   * Internal: calculate and dispatch global progress
   */
  _updateGlobalProgress() {
    const scrollTop = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    this.globalProgress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
  }

  /**
   * Refresh all ScrollTriggers (call after layout changes)
   */
  refresh() {
    ScrollTrigger.refresh();
  }

  /**
   * Destroy all triggers and cleanup
   */
  destroy() {
    this.scrollTriggers.forEach(t => t.kill());
    this.scrollTriggers = [];
    this.scenes = [];
    this.isReady = false;
  }
}
