import { useEffect, useRef, useState } from 'react';

const FALLBACK = 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #422006 100%)';

function canAnimate() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.innerWidth < 768) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export default function VantaBackground({ children, className = '' }) {
  const ref = useRef(null);
  const [enabled] = useState(canAnimate);

  useEffect(() => {
    if (!enabled) return;
    let effect = null;
    let cancelled = false;

    (async () => {
      const THREE = await import('three');
      const NET = (await import('vanta/dist/vanta.net.min')).default;
      if (cancelled || !ref.current) return;
      effect = NET({
        el: ref.current,
        THREE,
        color: 0xf59e0b,
        backgroundColor: 0x0f172a,
        points: 10,
        maxDistance: 22,
        spacing: 18,
        mouseControls: true,
        touchControls: false,
        gyroControls: false,
      });
    })();

    return () => {
      cancelled = true;
      if (effect) effect.destroy();
    };
  }, [enabled]);

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={enabled ? undefined : { background: FALLBACK }}
    >
      {children}
    </div>
  );
}