'use client';

import { useEffect, useState } from 'react';
import { GAME_CONFIG } from '@/game/data/loader';

/** Animated loading screen shown while initGameData() resolves. */
export default function LoadingScreen({ fadeOut = false }: { fadeOut?: boolean }) {
  const [dots, setDots] = useState(0);

  // Animate the "Caricamento" dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const version = GAME_CONFIG.version || '1.0.0';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Scanline overlay (matches TitleScreen) */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />

      {/* Vignette overlay */}
      <div className="absolute inset-0 vignette-overlay pointer-events-none" />

      {/* Subtle red radial glow behind content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4">
        {/* Biohazard spinning logo */}
        <div className="biohazard-spinner mb-2">
          <BiohazardIcon />
        </div>

        {/* Game Title */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-neutral-100"
          style={{
            textShadow: '0 0 40px rgba(220,38,38,0.5), 0 0 80px rgba(220,38,38,0.25), 0 0 120px rgba(220,38,38,0.1), 3px 3px 0 #000',
          }}
        >
          RACCOON CITY
        </h1>

        {/* Separator line */}
        <div className="h-px w-40 bg-gradient-to-r from-transparent via-red-600/60 to-transparent" />

        {/* Loading text with animated dots */}
        <p className="text-red-400/80 text-sm sm:text-base font-mono tracking-[0.2em] uppercase loading-flicker">
          Caricamento{'.'.repeat(dots)}
        </p>

        {/* Version */}
        <p className="text-neutral-600 text-xs font-mono tracking-wider mt-4">
          v{version}
        </p>
      </div>
    </div>
  );
}

/* ─── SVG Biohazard Icon ─── */
function BiohazardIcon() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
      fill="none"
    >
      {/* Outer ring */}
      <circle
        cx="50" cy="50" r="46"
        stroke="#dc2626"
        strokeWidth="2"
        opacity="0.5"
      />
      {/* Inner ring */}
      <circle
        cx="50" cy="50" r="38"
        stroke="#dc2626"
        strokeWidth="1.5"
        opacity="0.3"
      />
      {/* Center circle */}
      <circle cx="50" cy="50" r="8" fill="#dc2626" opacity="0.9" />
      {/* Center dot */}
      <circle cx="50" cy="50" r="3" fill="#000" />
      {/* Three biohazard arcs (120° apart) */}
      <BiohazardArc cx={50} cy={50} r={30} startAngle={0} />
      <BiohazardArc cx={50} cy={50} r={30} startAngle={120} />
      <BiohazardArc cx={50} cy={50} r={30} startAngle={240} />
      {/* Connecting lines from center to each arc */}
      {[
        { angle: 30, innerR: 8, outerR: 18 },
        { angle: 150, innerR: 8, outerR: 18 },
        { angle: 270, innerR: 8, outerR: 18 },
      ].map(({ angle, innerR, outerR }) => {
        const rad = (angle - 90) * (Math.PI / 180);
        return (
          <line
            key={angle}
            x1={50 + Math.cos(rad) * innerR}
            y1={50 + Math.sin(rad) * innerR}
            x2={50 + Math.cos(rad) * outerR}
            y2={50 + Math.sin(rad) * outerR}
            stroke="#dc2626"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
        );
      })}
    </svg>
  );
}

/** Single biohazard arc (circular "petal" shape) */
function BiohazardArc({ cx, cy, r, startAngle }: { cx: number; cy: number; r: number; startAngle: number }) {
  const sweep = 60;
  const startRad = (startAngle - 90) * (Math.PI / 180);
  const midRad = ((startAngle + sweep / 2) - 90) * (Math.PI / 180);
  const endRad = ((startAngle + sweep) - 90) * (Math.PI / 180);

  const x1 = cx + Math.cos(startRad) * r;
  const y1 = cy + Math.sin(startRad) * r;
  const x2 = cx + Math.cos(endRad) * r;
  const y2 = cy + Math.sin(endRad) * r;
  const cxPetal = cx + Math.cos(midRad) * (r * 0.55);
  const cyPetal = cy + Math.sin(midRad) * (r * 0.55);

  return (
    <path
      d={`M ${x1} ${y1} Q ${cxPetal} ${cyPetal} ${x2} ${y2}`}
      stroke="#dc2626"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      opacity="0.8"
    />
  );
}
