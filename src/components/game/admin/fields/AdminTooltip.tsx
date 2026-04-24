'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// AdminTooltip — portal-based styled tooltip for the admin panel
// Renders via React Portal to document.body, so it never gets
// clipped by parent overflow:hidden/auto containers.
// Position is calculated dynamically from the trigger's bounding rect.
// ═══════════════════════════════════════════════════════════════

interface AdminTooltipProps {
  /** The tooltip text to display */
  text: string;
  /** Position of the tooltip relative to the trigger */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Additional classes for the trigger wrapper */
  className?: string;
  /** Whether to show the Info icon (default true). If false, shows "(?)" text */
  showIcon?: boolean;
}

const GAP = 8;

function getArrowStyle(side: string): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderWidth: '5px',
    borderStyle: 'solid',
    borderColor: 'transparent',
  };
  switch (side) {
    case 'top':
      return { ...base, bottom: '-10px', left: '50%', marginLeft: '-5px', borderTopColor: 'rgba(255,255,255,0.08)' };
    case 'bottom':
      return { ...base, top: '-10px', left: '50%', marginLeft: '-5px', borderBottomColor: 'rgba(255,255,255,0.08)' };
    case 'left':
      return { ...base, right: '-10px', top: '50%', marginTop: '-5px', borderLeftColor: 'rgba(255,255,255,0.08)' };
    case 'right':
      return { ...base, left: '-10px', top: '50%', marginTop: '-5px', borderRightColor: 'rgba(255,255,255,0.08)' };
    default:
      return base;
  }
}

function computeCoords(trigger: HTMLElement, side: string): { x: number; y: number } {
  const r = trigger.getBoundingClientRect();
  switch (side) {
    case 'top':
      return { x: r.left + r.width / 2, y: r.top - GAP };
    case 'bottom':
      return { x: r.left + r.width / 2, y: r.bottom + GAP };
    case 'left':
      return { x: r.left - GAP, y: r.top + r.height / 2 };
    case 'right':
      return { x: r.right + GAP, y: r.top + r.height / 2 };
    default:
      return { x: 0, y: 0 };
  }
}

const TRANSFORM_MAP: Record<string, string> = {
  top: 'translate(-50%, -100%)',
  bottom: 'translate(-50%, 0)',
  left: 'translate(-100%, -50%)',
  right: 'translate(0, -50%)',
};

export function AdminTooltip({
  text,
  side = 'top',
  className = '',
  showIcon = true,
}: AdminTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const portalReady = typeof document !== 'undefined';

  const handleEnter = () => {
    const el = triggerRef.current;
    if (el) setCoords(computeCoords(el, side));
    setShow(true);
  };

  // Keep position in sync during scroll/resize
  useEffect(() => {
    if (!show) return;

    const sync = () => {
      const el = triggerRef.current;
      if (el) setCoords(computeCoords(el, side));
    };

    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [show, side]);

  // Render tooltip via portal
  const tooltipPortal =
    show && portalReady
      ? createPortal(
          <div
            className="pointer-events-none"
            style={{
              position: 'fixed',
              left: `${coords.x}px`,
              top: `${coords.y}px`,
              transform: TRANSFORM_MAP[side],
              zIndex: 99999,
              animation: 'admin-tooltip-in 0.15s ease-out forwards',
            }}
          >
            <div
              className="
                relative text-[11px] leading-relaxed
                px-3 py-2.5 max-w-[340px] min-w-[80px]
                rounded-lg
                bg-neutral-900/[0.98]
                border border-white/[0.08]
                text-white/80
                whitespace-normal break-words
                shadow-xl shadow-black/50
                backdrop-blur-sm
              "
            >
              {text}
              <span style={getArrowStyle(side)} />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-flex items-center ${className}`}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
      >
        {showIcon ? (
          <Info className="w-3 h-3 text-white/20 hover:text-emerald-400/70 transition-colors duration-150 cursor-help" />
        ) : (
          <span className="text-[11px] text-white/25 cursor-help hover:text-emerald-400/70 transition-colors duration-200 select-none">
            (?)
          </span>
        )}
      </span>
      {tooltipPortal}
    </>
  );
}
