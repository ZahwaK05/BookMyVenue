import { useEffect, useRef, useState } from 'react';

// ====== CHANGE THIS ONE WORD ======
// Options: 'net' | 'waves' | 'fog' | 'birds' | 'globe' | 'dots' | 'halo'
const EFFECT = 'net';
// ==================================

// Set to false to respect the Windows "reduce motion" accessibility setting
const FORCE_ANIMATION = true;

const FALLBACK = 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #422006 100%)';

// Each effect: how to load it + its options (navy and amber theme)
const EFFECTS = {
  net: {
    load: () => import('vanta/dist/vanta.net.min'),
    options: {
      color: 0xf59e0b,
      backgroundColor: 0x0f172a,
      points: 10,        // more points = denser network
      maxDistance: 22,
      spacing: 18,
    },
  },
  waves: {
    load: () => import('vanta/dist/vanta.waves.min'),
    options: {
      color: 0x0b1a3a,
      shininess: 35,
      waveHeight: 18,
      waveSpeed: 0.7,
      zoom: 0.9,
    },
  },
  fog: {
    load: () => import('vanta/dist/vanta.fog.min'),
    options: {
      highlightColor: 0xf59e0b,
      midtoneColor: 0x1e3a8a,
      lowlightColor: 0x0f172a,
      baseColor: 0x0f172a,
      blurFactor: 0.6,
      speed: 1.2,
      zoom: 1.0,
    },
  },
  birds: {
    load: () => import('vanta/dist/vanta.birds.min'),
    options: {
      backgroundColor: 0x0f172a,
      color1: 0xf59e0b,
      color2: 0xfde68a,
      birdSize: 1.2,
      quantity: 3,
      separation: 40,
      alignment: 30,
      cohesion: 30,
    },
  },
  globe: {
    load: () => import('vanta/dist/vanta.globe.min'),
    options: {
      color: 0xf59e0b,
      color2: 0xfde68a,
      backgroundColor: 0x0f172a,
      size: 1.0,
    },
  },
  dots: {
    load: () => import('vanta/dist/vanta.dots.min'),
    options: {
      color: 0xf59e0b,
      color2: 0xfde68a,
      backgroundColor: 0x0f172a,
      size: 3.0,
      spacing: 35,
      showLines: false,
    },
  },
  halo: {
    load: () => import('vanta/dist/vanta.halo.min'),
    options: {
      backgroundColor: 0x0f172a,
      baseColor: 0xf59e0b,
      size: 1.2,
      amplitudeFactor: 1.2,
    },
  },
};

function checkAnimate() {
  if (typeof window === 'undefined') return { ok: false, why: 'no window' };
  if (!FORCE_ANIMATION && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return { ok: false, why: 'reduced motion is on' };
  if (window.innerWidth < 768) return { ok: false, why: 'window narrower than 768px' };
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl') || c.getContext('experimental-webgl')))
      return { ok: false, why: 'WebGL not available' };
  } catch {
    return { ok: false, why: 'WebGL check threw' };
  }
  return { ok: true };
}

export default function VantaBackground({ children, className = '' }) {
  const ref = useRef(null);
  const [state] = useState(checkAnimate);
  const enabled = state.ok;

  useEffect(() => {
    if (!enabled) {
      console.info('[Vanta] skipped:', state.why);
      return;
    }
    const cfg = EFFECTS[EFFECT] || EFFECTS.net;
    let effect = null;
    let observer = null;
    let cancelled = false;

    (async () => {
      try {
        const THREE = await import('three');
        const mod = await cfg.load();
        const create = mod.default?.default ?? mod.default ?? mod;
        if (typeof create !== 'function') {
          console.error('[Vanta] effect is not a function:', mod);
          return;
        }
        if (cancelled || !ref.current) return;
        effect = create({
          el: ref.current,
          THREE,
          mouseControls: true,
          touchControls: false,
          gyroControls: false,
          ...cfg.options,
        });

        // Keep the canvas the same size as the element, even when the
        // element grows or shrinks after Vanta started.
        const refit = () => {
          if (effect && typeof effect.resize === 'function') effect.resize();
        };
        observer = new ResizeObserver(refit);
        observer.observe(ref.current);
        setTimeout(refit, 300); // once more after fonts/images settle
      } catch (err) {
        console.error('[Vanta] failed to start:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (effect) effect.destroy();
    };
  }, [enabled, state.why]);

  return (
    <div ref={ref} className={`relative ${className}`} style={{ background: FALLBACK }}>
      {children}
    </div>
  );
}