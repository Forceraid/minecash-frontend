import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import styles from './CrashRocketScene.module.css';

interface CrashRocketSceneProps {
  multiplier: number;
  phase: 'waiting' | 'betting' | 'playing' | 'crashed';
  className?: string;
}

// Enhanced interpolation helper functions
const interpolateColor = (color1: string, color2: string, factor: number): string => {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  // Enhanced cubic easing for smoother color transitions
  const easedFactor = factor * factor * (3 - 2 * factor);
  
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * easedFactor);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * easedFactor);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * easedFactor);

  return `rgb(${r}, ${g}, ${b})`;
};

const interpolateGradient = (colors1: string[], colors2: string[], factor: number): string => {
  const interpolatedColors = colors1.map((color1, index) => {
    const color2 = colors2[index] || colors2[colors2.length - 1];
    return interpolateColor(color1, color2, factor);
  });
  
  // Enhanced gradient with more color stops for smoother transitions
  const stops = [
    '0%',
    '15%', 
    '30%',
    '45%',
    '60%',
    '75%',
    '90%',
    '100%'
  ];
  
  const gradientColors = interpolatedColors.map((color, index) => {
    const stop = stops[index] || '100%';
    return `${color} ${stop}`;
  });
  
  return `linear-gradient(135deg, ${gradientColors.join(', ')})`;
};

// Enhanced easing functions for smoother animations
const easing = {
  // Smooth acceleration and deceleration
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  
  // Exponential acceleration
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  
  // Smooth deceleration
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  
  // Bounce effect
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }
};

export default function CrashRocketScene({ multiplier, phase, className = '' }: CrashRocketSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  
  // Enhanced animation state
  const [animationState, setAnimationState] = useState({
    lastMultiplier: 1.0,
    lastPhase: phase,
    animationStartTime: Date.now(),
    smoothMultiplier: 1.0,
    rocketPosition: { x: 25, y: 40 },
    flameIntensity: 0.4,
    particleCount: 0
  });

  useEffect(() => {
    if (!mountRef.current || initializedRef.current) return;

    const WIDTH = mountRef.current.clientWidth;
    const HEIGHT = mountRef.current.clientHeight;

    // Enhanced scene with better fog and lighting
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1a1a, 15, 2000); // Darker fog for better contrast
    sceneRef.current = scene;

    // Enhanced camera with better positioning
    const camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 1, 10000);
    camera.position.x = 0;
    camera.position.z = 600;
    camera.position.y = -15;
    cameraRef.current = camera;

    // Enhanced renderer with better quality settings
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(WIDTH, HEIGHT);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Enhanced lighting system
    const ambientLight = new THREE.HemisphereLight(0x404040, 0x202020, 0.8);
    const directionalLight = new THREE.DirectionalLight(0xdfebff, 1.2);
    directionalLight.position.set(-300, 0, 600);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    
    const pointLight = new THREE.PointLight(0xff6600, 2.5, 1200, 2);
    pointLight.position.set(200, -100, 50);
    
    const rocketLight = new THREE.PointLight(0xffdd00, 1.5, 300, 1);
    rocketLight.position.set(0, 0, 0);
    
    scene.add(ambientLight, directionalLight, pointLight, rocketLight);

    // Mark as initialized
    initializedRef.current = true;

    // Enhanced animation loop with 60fps target
    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= frameInterval) {
        // Update rocket light position based on animation state
        if (rocketLight) {
          rocketLight.intensity = animationState.flameIntensity * 2;
        }
        
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        lastTime = currentTime;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    // Enhanced resize handler
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      window.removeEventListener('resize', handleResize);
      rendererRef.current?.dispose();
      initializedRef.current = false;
    };
  }, []);

  // Enhanced animation state management
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - animationState.animationStartTime;
    
    // Smooth multiplier interpolation with enhanced easing
    if (phase === 'playing' && multiplier > 1.0) {
      const progress = Math.min(timeSinceLastUpdate / 1000, 1.0);
      const easedProgress = easing.easeInOutCubic(progress);
      
      const targetMultiplier = multiplier;
      const currentMultiplier = animationState.smoothMultiplier;
      const newMultiplier = currentMultiplier + (targetMultiplier - currentMultiplier) * 0.15;
      
      // Optimized camera positioning to keep rocket in view at high multipliers
      if (cameraRef.current) {
        const baseDistance = 600;
        const maxDistance = 2000; // Reduced max distance to keep rocket more visible
        
        // More gentle camera scaling that keeps rocket in view
        const scalingFactor = 0.3; // Reduced from 0.8 for gentler scaling
        const distanceMultiplier = 1 + Math.min((newMultiplier - 1) * scalingFactor, 2);
        const newDistance = Math.min(baseDistance * distanceMultiplier, maxDistance);
        
        // Smoother camera movement
        const currentZ = cameraRef.current.position.z;
        cameraRef.current.position.z = currentZ + (newDistance - currentZ) * 0.15;
        
        // Keep rocket more centered in view
        const baseY = -15;
        const targetY = baseY - Math.min((newMultiplier - 1) * 3, 30); // Limit vertical movement
        cameraRef.current.position.y = cameraRef.current.position.y + (targetY - cameraRef.current.position.y) * 0.15;
        
        // Optional: Slight FOV adjustment for extreme multipliers
        if (newMultiplier > 20) {
          const baseFOV = 75;
          const targetFOV = Math.min(baseFOV + (newMultiplier - 20) * 0.5, 90);
          cameraRef.current.fov = cameraRef.current.fov + (targetFOV - cameraRef.current.fov) * 0.1;
          cameraRef.current.updateProjectionMatrix();
        }
      }
      
      setAnimationState(prev => ({
        ...prev,
        smoothMultiplier: newMultiplier,
        lastMultiplier: multiplier,
        flameIntensity: Math.min(0.7 + newMultiplier * 0.2, 1.0)
      }));
    } else {
      // Reset camera to base position when not playing
      if (cameraRef.current) {
        const baseDistance = 600;
        const baseY = -15;
        cameraRef.current.position.z = cameraRef.current.position.z + (baseDistance - cameraRef.current.position.z) * 0.1;
        cameraRef.current.position.y = cameraRef.current.position.y + (baseY - cameraRef.current.position.y) * 0.1;
      }
      
      setAnimationState(prev => ({
        ...prev,
        smoothMultiplier: multiplier,
        lastMultiplier: multiplier,
        flameIntensity: phase === 'betting' ? 0.6 : 0.4
      }));
    }
    
    // Update phase-specific animations
    if (phase !== animationState.lastPhase) {
      setAnimationState(prev => ({
        ...prev,
        lastPhase: phase,
        animationStartTime: now
      }));
    }
  }, [multiplier, phase, animationState.animationStartTime, animationState.lastPhase]);

  // Enhanced background color calculation with smoother transitions
  const getBackgroundColor = () => {
    if (phase === 'crashed') {
      return 'linear-gradient(135deg, #0a0a0a 0%, #2a0a0a 15%, #4a0a0a 30%, #6a0a0a 45%, #8b0000 60%, #cc0000 75%, #ff0000 90%, #ff3333 100%)';
    } else if (phase === 'waiting' || phase === 'betting') {
      return 'linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 15%, #2C2C2C 30%, #3A3A3A 45%, #4A4A4A 60%, #5A5A5A 75%, #6A6A6A 90%, #7A7A7A 100%)';
    } else if (phase === 'playing') {
      // Enhanced color stages with more granular interpolation
      const colorStages = [
        { 
          multiplier: 1.0, 
          colors: ['#0F0F0F', '#1A1A1A', '#2C2C2C', '#3A3A3A', '#4A4A4A', '#5A5A5A', '#6A6A6A', '#7A7A7A'] 
        },
        { 
          multiplier: 1.5, 
          colors: ['#0F0F0F', '#1A1A1A', '#2C2C2C', '#3A3A3A', '#4A4A4A', '#5A5A5A', '#6A6A6A', '#7A7A7A'] 
        },
        { 
          multiplier: 2.0, 
          colors: ['#0F0F0F', '#1A1A1A', '#2C2C2C', '#3A3A3A', '#4A4A4A', '#5A5A5A', '#6A6A6A', '#7A7A7A'] 
        },
        { 
          multiplier: 3.0, 
          colors: ['#0F0F0F', '#1A1A1A', '#2C2C2C', '#3A3A3A', '#4A4A4A', '#5A5A5A', '#6A6A6A', '#7A7A7A'] 
        },
        { 
          multiplier: 5.0, 
          colors: ['#0F0F0F', '#1A1A1A', '#2C2C2C', '#3A3A3A', '#4A4A4A', '#5A5A5A', '#6A6A6A', '#7A7A7A'] 
        }
      ];

      // Find the appropriate color stage with enhanced interpolation
      let stageIndex = 0;
      for (let i = 0; i < colorStages.length - 1; i++) {
        if (animationState.smoothMultiplier >= colorStages[i].multiplier && animationState.smoothMultiplier < colorStages[i + 1].multiplier) {
          stageIndex = i;
          break;
        }
      }
      if (animationState.smoothMultiplier >= colorStages[colorStages.length - 1].multiplier) {
        stageIndex = colorStages.length - 1;
      }

      const currentStage = colorStages[stageIndex];
      const nextStage = colorStages[Math.min(stageIndex + 1, colorStages.length - 1)];
      
      // Enhanced interpolation factor calculation
      const factor = nextStage.multiplier === currentStage.multiplier ? 0 : 
        (animationState.smoothMultiplier - currentStage.multiplier) / (nextStage.multiplier - currentStage.multiplier);
      
      return interpolateGradient(currentStage.colors, nextStage.colors, factor);
    }
    
    return 'linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 15%, #2C2C2C 30%, #3A3A3A 45%, #4A4A4A 60%, #5A5A5A 75%, #6A6A6A 90%, #7A7A7A 100%)';
  };

  // Enhanced flame color calculation with supersonic mode
  const getFlameColor = () => {
    if (phase !== 'playing') {
      return 'linear-gradient(45deg, #E63946 0%, #FF8C00 15%, #FFD700 30%, #FFD700 45%, #FFD700 60%, #FFD700 75%, #FFD700 90%, #FFD700 100%)';
    }

    // Casino themed colors and supersonic stages
    const flameStages = [
      { 
        multiplier: 1.0, 
        colors: ['#ffd700', '#ffb700', '#ff9500', '#ff7300', '#ff5100', '#ff2f00', '#ff0d00', '#ff0000'] 
      },
      { 
        multiplier: 1.5, 
        colors: ['#ffd700', '#ffc300', '#ffaf00', '#ff9b00', '#ff8700', '#ff7300', '#ff5f00', '#ff4b00'] 
      },
      { 
        // Supersonic transition
        multiplier: 2.0, 
        colors: ['#ffd700', '#ffe100', '#fff500', '#ffff00', '#ffffff', '#ffff00', '#ffe100', '#ffd700'] 
      },
      { 
        // Full supersonic
        multiplier: 3.0, 
        colors: ['#ffffff', '#fffafa', '#fff5f5', '#fff0f0', '#ffebeb', '#ffe6e6', '#ffe1e1', '#ffdbdb'] 
      },
      { 
        // Intense supersonic
        multiplier: 5.0, 
        colors: ['#ffffff', '#f0f8ff', '#e6f3ff', '#dcedff', '#d2e8ff', '#c8e2ff', '#bedcff', '#b4d7ff'] 
      }
    ];

    // Find the appropriate flame stage with enhanced interpolation
    let stageIndex = 0;
    for (let i = 0; i < flameStages.length - 1; i++) {
      if (animationState.smoothMultiplier >= flameStages[i].multiplier && animationState.smoothMultiplier < flameStages[i + 1].multiplier) {
        stageIndex = i;
        break;
      }
    }
    if (animationState.smoothMultiplier >= flameStages[flameStages.length - 1].multiplier) {
      stageIndex = flameStages.length - 1;
    }

    const currentStage = flameStages[stageIndex];
    const nextStage = flameStages[Math.min(stageIndex + 1, flameStages.length - 1)];
    
    // Enhanced interpolation factor calculation
    const factor = nextStage.multiplier === currentStage.multiplier ? 0 : 
      (animationState.smoothMultiplier - currentStage.multiplier) / (nextStage.multiplier - currentStage.multiplier);
    
    return interpolateGradient(currentStage.colors, nextStage.colors, factor);
  };

  // Enhanced rocket position calculation with smoother movement
  const getRocketPosition = () => {
    if (phase === 'betting' || phase === 'waiting') {
      return { x: 25, y: 40 };
    } else if (phase === 'playing') {
      // Enhanced movement with exponential acceleration and smooth easing
      const speedMultiplier = Math.min(animationState.smoothMultiplier * 0.8, 4);
      const rawProgress = Math.min((animationState.smoothMultiplier - 1) / (2 * speedMultiplier), 1);
      const easedProgress = easing.easeInOutCubic(rawProgress);
      
      // Move from 25% to 50% (center of screen)
      const x = 25 + (easedProgress * 25); // 25% to 50%
      
      // Enhanced vertical movement with bounce effect
      const verticalProgress = easing.easeOutBounce(rawProgress);
      const y = 40 - (verticalProgress * 25); // 40% to 15%
      
      return { x, y };
    }
    return { x: 50, y: 20 }; // Crashed position
  };

  // Enhanced flame position calculation
  const getFlamePosition = () => {
    const rocketPos = getRocketPosition();
    return {
      x: rocketPos.x,
      y: rocketPos.y + 15 // Always below rocket
    };
  };

  const rocketPos = getRocketPosition();
  const flamePos = getFlamePosition();

  return (
    <div 
      className={`w-full h-full ${className}`}
      style={{ 
        position: 'relative',
        background: getBackgroundColor(),
        overflow: 'hidden',
        perspective: '10rem',
        transition: 'background 0.2s ease-out', // Smoother background transitions
        // Add subtle zoom effect for spacious feel
        transform: phase === 'playing' ? `scale(${1 + (animationState.smoothMultiplier - 1) * 0.05})` : 'scale(1)',
        transformOrigin: 'center center'
      }}
    >
      {/* Enhanced 3D Canvas */}
      <div 
        ref={mountRef} 
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      />
      
      {/* Enhanced rain effects with better timing */}
      <div className={`${styles.rain} ${styles.rain1}`}></div>
      <div className={`${styles.rain} ${styles.rain2}`}><div className={`${styles.drop} ${styles.drop2}`}></div></div>
      <div className={`${styles.rain} ${styles.rain3}`}></div>
      <div className={`${styles.rain} ${styles.rain4}`}></div>
      <div className={`${styles.rain} ${styles.rain5}`}><div className={`${styles.drop} ${styles.drop5}`}></div></div>
      <div className={`${styles.rain} ${styles.rain6}`}></div>
      <div className={`${styles.rain} ${styles.rain7}`}></div>
      <div className={`${styles.rain} ${styles.rain8}`}><div className={`${styles.drop} ${styles.drop8}`}></div></div>
      <div className={`${styles.rain} ${styles.rain9}`}></div>
      <div className={`${styles.rain} ${styles.rain10}`}></div>
      <div className={`${styles.drop} ${styles.drop11}`}></div>
      <div className={`${styles.drop} ${styles.drop12}`}></div>
      
      {/* Enhanced CSS Rocket with smoother animations */}
      <div 
        className={phase === 'crashed' ? styles.rocketWrapperHidden : styles.rocketWrapper}
        style={{
          left: `${rocketPos.x}%`,
          top: `${rocketPos.y}%`,
          transition: 'none', // Remove transition for smoother frame-based animation
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div 
          className={styles.rocketBody}
          style={{
            transform: (() => {
              const floatOffset = Math.sin(Date.now() * 0.002) * 1.5; // Smoother floating
              if (phase === 'playing') {
                const rawProgress = Math.min((animationState.smoothMultiplier - 1) / 2, 1);
                const rotation = rawProgress > 0.9 ? 0 : Math.min(animationState.smoothMultiplier * 3, 30);
                // Keep rocket visible at high multipliers with controlled scaling
                const maxScale = 2.0; // Increased maximum size for better visibility
                const scaleFactor = 1 + Math.min((animationState.smoothMultiplier - 1) * 0.02, maxScale - 1);
                return `translateY(${floatOffset}px) rotate(${Math.round(rotation * 10) / 10}deg) scale(${scaleFactor})`;
              }
              return `translateY(${floatOffset}px) rotate(0deg) scale(1)`;
            })()
          }}
        >
          <div className={styles.rocketNose}></div>
          <div className={styles.rocketMain}></div>
          <div className={styles.rocketFins}></div>
        </div>
      </div>

      {/* Enhanced flame effect with supersonic zigzag */}
      <div 
        className={styles.fireWrapper}
        style={{
          left: `${flamePos.x}%`,
          top: `${flamePos.y}%`,
          transition: 'none', // Remove transition for smoother frame-based animation
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Main flame */}
        <div 
          className={styles.fire}
          style={{
            width: '100%',
            height: `${phase === 'playing' ? Math.min(50 + animationState.smoothMultiplier * 6, 100) : 40}px`,
            background: getFlameColor(),
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            opacity: phase === 'crashed' ? 0 : animationState.flameIntensity,
            filter: phase === 'playing' ? `brightness(${1 + animationState.smoothMultiplier * 0.2}) blur(${Math.min(animationState.smoothMultiplier * 0.3, 1.5)}px)` : 'none',
            display: phase === 'crashed' ? 'none' : 'block',
            transform: phase === 'playing' ? `scale(${1 + Math.min((animationState.smoothMultiplier - 1) * 0.05, 0.5)})` : 'scale(1)',
            boxShadow: phase === 'playing' ? `0 0 ${Math.min(animationState.smoothMultiplier * 8, 50)}px ${animationState.smoothMultiplier >= 2 ? '#ffffff' : '#ffd700'}` : 'none',
            position: 'relative',
            overflow: 'visible'
          }}
        />
        
        {/* No additional flame effects */}
      </div>
    </div>
  );
}