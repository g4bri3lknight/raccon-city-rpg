'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Palette, Loader2, Save, RotateCcw, Eye, EyeOff, Sparkles } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

// ── Types ──────────────────────────────────────────────────────────
type SettingType = 'color' | 'select' | 'range' | 'toggle';

interface ThemeSettingDef {
  key: string;
  label: string;
  type: SettingType;
  default: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

interface ThemeGroupDef {
  id: string;
  label: string;
  icon: string;
  settings: ThemeSettingDef[];
}

// ── Theme Presets ──────────────────────────────────────────────────
interface ThemePreset {
  id: string;
  label: string;
  icon: string;
  colors: string[];
  settings: Record<string, string>;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'raccoon-city',
    label: 'Raccoon City',
    icon: '🧟',
    colors: ['#dc2626', '#ef4444', '#f87171'],
    settings: {
      'theme.primaryColor': '#dc2626',
      'theme.secondaryColor': '#ef4444',
      'theme.accentColor': '#f87171',
      'theme.backgroundColor': '#0a0a0a',
      'theme.fontFamily': 'Courier New',
      'theme.headingWeight': 'extrabold',
      'theme.fontSizeScale': '1.0',
      'theme.cardStyle': 'solid',
      'theme.cardOpacity': '0.6',
      'theme.borderRadius': '12',
      'theme.borderColor': '#dc262620',
      'theme.buttonStyle': 'rounded',
      'theme.buttonVariant': 'filled',
      'theme.tableStyle': 'clean',
      'theme.hoverHighlight': 'strong',
      'theme.glowEnabled': 'true',
      'theme.glowColor': '#dc2626',
      'theme.glowIntensity': '0.6',
      'theme.scanlineEnabled': 'false',
      'theme.titleColor': '#e5e5e5',
      'theme.titleGlow': '#dc2626',
      'theme.subtitleColor': '#f87171',
    },
  },
  {
    id: 'fantasy',
    label: 'Fantasy',
    icon: '🏰',
    colors: ['#22c55e', '#eab308', '#a855f7'],
    settings: {
      'theme.primaryColor': '#22c55e',
      'theme.secondaryColor': '#eab308',
      'theme.accentColor': '#a855f7',
      'theme.backgroundColor': '#0f1a0a',
      'theme.fontFamily': 'Georgia',
      'theme.headingWeight': 'bold',
      'theme.fontSizeScale': '1.0',
      'theme.cardStyle': 'glass',
      'theme.cardOpacity': '0.5',
      'theme.borderRadius': '12',
      'theme.borderColor': '#22c55e20',
      'theme.buttonStyle': 'rounded',
      'theme.buttonVariant': 'filled',
      'theme.tableStyle': 'striped',
      'theme.hoverHighlight': 'subtle',
      'theme.glowEnabled': 'true',
      'theme.glowColor': '#22c55e',
      'theme.glowIntensity': '0.3',
      'theme.scanlineEnabled': 'false',
      'theme.titleColor': '#fde68a',
      'theme.titleGlow': '#eab308',
      'theme.subtitleColor': '#ffffff80',
    },
  },
  {
    id: 'horror',
    label: 'Horror',
    icon: '🩸',
    colors: ['#dc2626', '#6b7280', '#374151'],
    settings: {
      'theme.primaryColor': '#dc2626',
      'theme.secondaryColor': '#6b7280',
      'theme.accentColor': '#991b1b',
      'theme.backgroundColor': '#0a0808',
      'theme.fontFamily': 'Georgia',
      'theme.headingWeight': 'black',
      'theme.fontSizeScale': '1.0',
      'theme.cardStyle': 'glass',
      'theme.cardOpacity': '0.4',
      'theme.borderRadius': '8',
      'theme.borderColor': '#dc262618',
      'theme.buttonStyle': 'square',
      'theme.buttonVariant': 'outlined',
      'theme.tableStyle': 'clean',
      'theme.hoverHighlight': 'strong',
      'theme.glowEnabled': 'true',
      'theme.glowColor': '#dc2626',
      'theme.glowIntensity': '0.4',
      'theme.scanlineEnabled': 'true',
      'theme.titleColor': '#dc2626',
      'theme.titleGlow': '#991b1b',
      'theme.subtitleColor': '#ffffff60',
    },
  },
  {
    id: 'scifi',
    label: 'Sci-Fi',
    icon: '🚀',
    colors: ['#06b6d4', '#8b5cf6', '#3b82f6'],
    settings: {
      'theme.primaryColor': '#06b6d4',
      'theme.secondaryColor': '#8b5cf6',
      'theme.accentColor': '#3b82f6',
      'theme.backgroundColor': '#050a14',
      'theme.fontFamily': 'JetBrains Mono',
      'theme.headingWeight': 'extrabold',
      'theme.fontSizeScale': '1.0',
      'theme.cardStyle': 'outlined',
      'theme.cardOpacity': '0.5',
      'theme.borderRadius': '8',
      'theme.borderColor': '#06b6d425',
      'theme.buttonStyle': 'square',
      'theme.buttonVariant': 'ghost',
      'theme.tableStyle': 'grid',
      'theme.hoverHighlight': 'medium',
      'theme.glowEnabled': 'true',
      'theme.glowColor': '#06b6d4',
      'theme.glowIntensity': '0.5',
      'theme.scanlineEnabled': 'false',
      'theme.titleColor': '#67e8f9',
      'theme.titleGlow': '#06b6d4',
      'theme.subtitleColor': '#ffffff70',
    },
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    icon: '🌃',
    colors: ['#ec4899', '#facc15', '#a855f7'],
    settings: {
      'theme.primaryColor': '#ec4899',
      'theme.secondaryColor': '#facc15',
      'theme.accentColor': '#a855f7',
      'theme.backgroundColor': '#0a0514',
      'theme.fontFamily': 'system-ui',
      'theme.headingWeight': 'black',
      'theme.fontSizeScale': '1.1',
      'theme.cardStyle': 'solid',
      'theme.cardOpacity': '0.6',
      'theme.borderRadius': '4',
      'theme.borderColor': '#ec489930',
      'theme.buttonStyle': 'square',
      'theme.buttonVariant': 'filled',
      'theme.tableStyle': 'grid',
      'theme.hoverHighlight': 'strong',
      'theme.glowEnabled': 'true',
      'theme.glowColor': '#ec4899',
      'theme.glowIntensity': '0.6',
      'theme.scanlineEnabled': 'true',
      'theme.titleColor': '#f0abfc',
      'theme.titleGlow': '#ec4899',
      'theme.subtitleColor': '#facc1580',
    },
  },
  {
    id: 'medieval',
    label: 'Medieval',
    icon: '⚔️',
    colors: ['#d97706', '#78716c', '#92400e'],
    settings: {
      'theme.primaryColor': '#d97706',
      'theme.secondaryColor': '#78716c',
      'theme.accentColor': '#92400e',
      'theme.backgroundColor': '#110f0a',
      'theme.fontFamily': 'Georgia',
      'theme.headingWeight': 'extrabold',
      'theme.fontSizeScale': '1.1',
      'theme.cardStyle': 'solid',
      'theme.cardOpacity': '0.7',
      'theme.borderRadius': '12',
      'theme.borderColor': '#d9770625',
      'theme.buttonStyle': 'rounded',
      'theme.buttonVariant': 'filled',
      'theme.tableStyle': 'striped',
      'theme.hoverHighlight': 'subtle',
      'theme.glowEnabled': 'false',
      'theme.glowColor': '#d97706',
      'theme.glowIntensity': '0.2',
      'theme.scanlineEnabled': 'false',
      'theme.titleColor': '#fde68a',
      'theme.titleGlow': '#d97706',
      'theme.subtitleColor': '#d6d3d180',
    },
  },
  {
    id: 'retro',
    label: 'Retro Pixel',
    icon: '👾',
    colors: ['#22c55e', '#000000', '#16a34a'],
    settings: {
      'theme.primaryColor': '#22c55e',
      'theme.secondaryColor': '#16a34a',
      'theme.accentColor': '#facc15',
      'theme.backgroundColor': '#000000',
      'theme.fontFamily': 'JetBrains Mono',
      'theme.headingWeight': 'bold',
      'theme.fontSizeScale': '1.0',
      'theme.cardStyle': 'solid',
      'theme.cardOpacity': '0.8',
      'theme.borderRadius': '0',
      'theme.borderColor': '#22c55e40',
      'theme.buttonStyle': 'square',
      'theme.buttonVariant': 'outlined',
      'theme.tableStyle': 'grid',
      'theme.hoverHighlight': 'strong',
      'theme.glowEnabled': 'true',
      'theme.glowColor': '#22c55e',
      'theme.glowIntensity': '0.5',
      'theme.scanlineEnabled': 'true',
      'theme.titleColor': '#22c55e',
      'theme.titleGlow': '#22c55e',
      'theme.subtitleColor': '#22c55e80',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    icon: '🌊',
    colors: ['#06b6d4', '#0ea5e9', '#fb7185'],
    settings: {
      'theme.primaryColor': '#06b6d4',
      'theme.secondaryColor': '#0ea5e9',
      'theme.accentColor': '#fb7185',
      'theme.backgroundColor': '#030a14',
      'theme.fontFamily': 'Inter',
      'theme.headingWeight': 'bold',
      'theme.fontSizeScale': '1.0',
      'theme.cardStyle': 'glass',
      'theme.cardOpacity': '0.5',
      'theme.borderRadius': '16',
      'theme.borderColor': '#06b6d420',
      'theme.buttonStyle': 'pill',
      'theme.buttonVariant': 'filled',
      'theme.tableStyle': 'clean',
      'theme.hoverHighlight': 'subtle',
      'theme.glowEnabled': 'true',
      'theme.glowColor': '#06b6d4',
      'theme.glowIntensity': '0.4',
      'theme.scanlineEnabled': 'false',
      'theme.titleColor': '#67e8f9',
      'theme.titleGlow': '#0ea5e9',
      'theme.subtitleColor': '#ffffff70',
    },
  },
  {
    id: 'desert',
    label: 'Desert',
    icon: '🏜️',
    colors: ['#ea580c', '#ca8a04', '#78716c'],
    settings: {
      'theme.primaryColor': '#ea580c',
      'theme.secondaryColor': '#ca8a04',
      'theme.accentColor': '#78716c',
      'theme.backgroundColor': '#140e06',
      'theme.fontFamily': 'Georgia',
      'theme.headingWeight': 'bold',
      'theme.fontSizeScale': '1.0',
      'theme.cardStyle': 'solid',
      'theme.cardOpacity': '0.6',
      'theme.borderRadius': '8',
      'theme.borderColor': '#ea580c20',
      'theme.buttonStyle': 'rounded',
      'theme.buttonVariant': 'filled',
      'theme.tableStyle': 'striped',
      'theme.hoverHighlight': 'medium',
      'theme.glowEnabled': 'false',
      'theme.glowColor': '#ea580c',
      'theme.glowIntensity': '0.2',
      'theme.scanlineEnabled': 'false',
      'theme.titleColor': '#fed7aa',
      'theme.titleGlow': '#ea580c',
      'theme.subtitleColor': '#d6d3d180',
    },
  },
];

// ── Theme Groups Definition ────────────────────────────────────────
const THEME_GROUPS: ThemeGroupDef[] = [
  {
    id: 'colors',
    label: 'Colori Principali',
    icon: '🎨',
    settings: [
      { key: 'theme.primaryColor', label: 'Colore Primario', type: 'color', default: '#dc2626' },
      { key: 'theme.secondaryColor', label: 'Colore Secondario', type: 'color', default: '#ef4444' },
      { key: 'theme.accentColor', label: 'Colore Accento', type: 'color', default: '#f87171' },
      { key: 'theme.backgroundColor', label: 'Sfondo', type: 'color', default: '#0a0a0a' },
    ],
  },
  {
    id: 'typography',
    label: 'Tipografia',
    icon: '✏️',
    settings: [
      { key: 'theme.fontFamily', label: 'Font Family', type: 'select', default: 'Courier New', options: ['Courier New', 'Inter', 'Georgia', 'JetBrains Mono', 'system-ui'] },
      { key: 'theme.headingWeight', label: 'Peso Titoli', type: 'select', default: 'bold', options: ['bold', 'extrabold', 'black'] },
      { key: 'theme.fontSizeScale', label: 'Scala Font', type: 'range', default: '1.0', min: 0.8, max: 1.4, step: 0.1 },
    ],
  },
  {
    id: 'interface',
    label: 'Interfaccia',
    icon: '🖼️',
    settings: [
      { key: 'theme.cardStyle', label: 'Stile Card', type: 'select', default: 'glass', options: ['glass', 'solid', 'outlined'] },
      { key: 'theme.cardOpacity', label: 'Opacità Card', type: 'range', default: '0.6', min: 0.3, max: 1.0, step: 0.05 },
      { key: 'theme.borderRadius', label: 'Border Radius', type: 'range', default: '12', min: 0, max: 24, step: 2, unit: 'px' },
      { key: 'theme.borderColor', label: 'Colore Bordo', type: 'color', default: '#dc262620' },
    ],
  },
  {
    id: 'buttons',
    label: 'Pulsanti',
    icon: '🔘',
    settings: [
      { key: 'theme.buttonStyle', label: 'Forma Pulsanti', type: 'select', default: 'rounded', options: ['rounded', 'pill', 'square'] },
      { key: 'theme.buttonVariant', label: 'Variante Pulsanti', type: 'select', default: 'filled', options: ['filled', 'outlined', 'ghost'] },
    ],
  },
  {
    id: 'tables',
    label: 'Tabelle e Liste',
    icon: '📋',
    settings: [
      { key: 'theme.tableStyle', label: 'Stile Tabella', type: 'select', default: 'striped', options: ['striped', 'clean', 'grid'] },
      { key: 'theme.hoverHighlight', label: 'Evidenziazione Hover', type: 'select', default: 'subtle', options: ['subtle', 'medium', 'strong'] },
    ],
  },
  {
    id: 'effects',
    label: 'Effetti',
    icon: '🌈',
    settings: [
      { key: 'theme.glowEnabled', label: 'Effetto Glow', type: 'toggle', default: 'true' },
      { key: 'theme.glowColor', label: 'Colore Glow', type: 'color', default: '#dc2626' },
      { key: 'theme.glowIntensity', label: 'Intensità Glow', type: 'range', default: '0.6', min: 0.1, max: 1.0, step: 0.1 },
      { key: 'theme.scanlineEnabled', label: 'Effetto Scanline', type: 'toggle', default: 'false' },
    ],
  },
  {
    id: 'title-screen',
    label: 'Schermata Titolo',
    icon: '🎭',
    settings: [
      { key: 'theme.titleColor', label: 'Colore Titolo', type: 'color', default: '#e5e5e5' },
      { key: 'theme.titleGlow', label: 'Glow Titolo', type: 'color', default: '#dc2626' },
      { key: 'theme.subtitleColor', label: 'Colore Sottotitolo', type: 'color', default: '#f87171' },
    ],
  },
];

// All setting keys flattened for easy iteration
const ALL_SETTINGS = THEME_GROUPS.flatMap(g => g.settings);

// Default values map
const DEFAULTS: Record<string, string> = {};
for (const s of ALL_SETTINGS) {
  DEFAULTS[s.key] = s.default;
}

// ── Helper: safely parse numeric values (avoids falsy-zero bug) ──
function safeParseFloat(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

// ── Hover highlight alpha map ──
const HOVER_ALPHA: Record<string, number> = { subtle: 0.06, medium: 0.12, strong: 0.22 };

// ── Preview Panel (interactive, with hover states) ──────────────────
function PreviewPanel({ styles, hoverHighlight }: { styles: ReturnType<typeof usePreviewStyles>; hoverHighlight: string }) {
  const [hoveredBtn, setHoveredBtn] = useState<0 | 1 | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState(false);
  const alpha = HOVER_ALPHA[hoverHighlight] ?? 0.06;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 overflow-hidden h-fit">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-3.5 h-3.5 text-emerald-400/60" />
        <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider">Anteprima Live</h4>
      </div>
      <div
        className="rounded-lg p-5 relative transition-all duration-300"
        style={{
          backgroundColor: styles.bgColor,
          fontFamily: styles.fontFamily,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: styles.borderColor,
        }}
      >
        {/* Scanline overlay */}
        {styles.scanlineEnabled && (
          <div
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
              zIndex: 10,
            }}
          />
        )}

        {/* Sample Heading */}
        <h3
          className="mb-3 transition-all duration-200"
          style={{
            color: styles.primary,
            fontSize: `${20 * styles.fontScale}px`,
            fontWeight: styles.hWeight,
            textShadow: styles.glowEnabled
              ? `0 0 ${styles.glowIntensity * 20}px ${styles.glowColor}`
              : 'none',
          }}
        >
          Hero Quest
        </h3>

        {/* Sample Card (with hover) */}
        <div
          className="mb-3 p-3 transition-all duration-200 cursor-pointer"
          style={{
            backgroundColor: hoveredCard
              ? `${styles.primary}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
              : styles.cardBg,
            borderRadius: `${styles.borderRadius}px`,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: hoveredCard ? `${styles.primary}40` : styles.borderColor,
            backdropFilter: 'blur(8px)',
            transform: hoveredCard ? 'translateY(-1px)' : 'none',
          }}
          onMouseEnter={() => setHoveredCard(true)}
          onMouseLeave={() => setHoveredCard(false)}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
              style={{ backgroundColor: `${styles.secondary}33`, color: styles.secondary }}
            >
              ⚔️
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold truncate transition-all duration-200"
                style={{
                  color: '#fff',
                  fontSize: `${13 * styles.fontScale}px`,
                }}
              >
                Guerriero
              </p>
              <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Spada del Destino · ATK +45
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-mono" style={{ color: styles.accent }}>Lv. 12</p>
            </div>
          </div>
        </div>

        {/* Sample Button Row (interactive) */}
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-1.5 text-[11px] font-semibold transition-all duration-200 cursor-pointer active:scale-95"
            style={{
              backgroundColor: hoveredBtn === 0
                ? styles.btnVariant === 'outlined'
                  ? `${styles.primary}20`
                  : styles.btnVariant === 'ghost'
                    ? `${styles.primary}33`
                    : styles.btnBg
                : styles.btnBg,
              borderColor: hoveredBtn === 0 ? styles.primary : styles.btnBorder,
              color: styles.btnText,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: styles.btnBorderRadius,
              transform: hoveredBtn === 0 ? 'translateY(-1px)' : 'none',
              boxShadow: hoveredBtn === 0 && styles.glowEnabled
                ? `0 2px ${styles.glowIntensity * 12}px ${styles.glowColor}40`
                : 'none',
            }}
            onMouseEnter={() => setHoveredBtn(0)}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            Esplora
          </button>
          <button
            className="px-4 py-1.5 text-[11px] font-semibold transition-all duration-200 cursor-pointer active:scale-95"
            style={{
              backgroundColor: hoveredBtn === 1
                ? `${styles.secondary}33`
                : `${styles.secondary}22`,
              borderColor: hoveredBtn === 1 ? styles.secondary : `${styles.secondary}60`,
              color: styles.secondary,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: styles.btnBorderRadius,
              transform: hoveredBtn === 1 ? 'translateY(-1px)' : 'none',
              boxShadow: hoveredBtn === 1 ? `0 2px 8px ${styles.secondary}30` : 'none',
            }}
            onMouseEnter={() => setHoveredBtn(1)}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            Inventario
          </button>
        </div>

        {/* Sample Table (with hover rows) */}
        <div
          className="mt-3 rounded overflow-hidden transition-all duration-200"
          style={{ borderRadius: `${styles.borderRadius}px`, borderWidth: '1px', borderStyle: 'solid', borderColor: styles.borderColor }}
        >
          <div className="px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Oggetti</p>
          </div>
          {['Pozione Cura', 'Pergamena Fuoco', 'Scudo Magico'].map((name, i) => (
            <div
              key={name}
              className="px-3 py-1.5 flex items-center justify-between text-[11px] cursor-pointer transition-all duration-150"
              style={{
                backgroundColor: hoveredRow === i
                  ? `${styles.primary}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
                  : (styles.tableStyle === 'striped' && i % 2 === 0)
                    ? 'rgba(255,255,255,0.02)'
                    : 'transparent',
                borderLeft: hoveredRow === i ? `2px solid ${styles.primary}60` : '2px solid transparent',
                paddingLeft: hoveredRow === i ? '10px' : '12px',
              }}
              onMouseEnter={() => setHoveredRow(i)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <span style={{ color: hoveredRow === i ? '#fff' : 'rgba(255,255,255,0.6)' }}>{name}</span>
              <span className="font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>×{3 - i}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Preview styles hook (shared logic) ────────────────────────────
function usePreviewStyles(get: (key: string) => string) {
  return useMemo(() => {
    const primary = get('theme.primaryColor');
    const secondary = get('theme.secondaryColor');
    const accent = get('theme.accentColor');
    const bgColor = get('theme.backgroundColor');
    const fontFamily = get('theme.fontFamily');
    const headingWeight = get('theme.headingWeight');
    const fontScale = safeParseFloat(get('theme.fontSizeScale'), 1.0);
    const cardStyle = get('theme.cardStyle');
    const cardOpacity = safeParseFloat(get('theme.cardOpacity'), 0.6);
    const borderRadius = parseInt(get('theme.borderRadius')) || 12;
    const borderColor = get('theme.borderColor');
    const buttonStyle = get('theme.buttonStyle');
    const buttonVariant = get('theme.buttonVariant');
    const glowEnabled = get('theme.glowEnabled') === 'true';
    const glowColor = get('theme.glowColor');
    const glowIntensity = safeParseFloat(get('theme.glowIntensity'), 0.3);
    const scanlineEnabled = get('theme.scanlineEnabled') === 'true';

    let cardBg = `rgba(255,255,255,${cardOpacity * 0.06})`;
    if (cardStyle === 'solid') {
      cardBg = `rgba(255,255,255,${cardOpacity * 0.12})`;
    }

    const br = buttonStyle === 'pill' ? '9999px' : buttonStyle === 'square' ? `${borderRadius / 2}px` : `${borderRadius}px`;
    let btnBg = primary;
    let btnBorder = 'transparent';
    let btnText = '#fff';
    if (buttonVariant === 'outlined') {
      btnBg = 'transparent';
      btnBorder = primary;
      btnText = primary;
    } else if (buttonVariant === 'ghost') {
      btnBg = `${primary}22`;
      btnBorder = 'transparent';
      btnText = primary;
    }

    const weightMap: Record<string, number> = { bold: 700, extrabold: 800, black: 900 };
    const hWeight = weightMap[headingWeight] || 700;

    return {
      bgColor, fontFamily, fontScale, hWeight, cardBg, cardOpacity, borderRadius,
      borderColor, primary, secondary, accent, btnBg, btnBorder, btnText,
      btnBorderRadius: br, glowEnabled, glowColor, glowIntensity, scanlineEnabled,
      buttonVariant,
    };
  }, [get]);
}

// ── Component ──────────────────────────────────────────────────────
export default function ThemeEditor() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Fetch theme settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/game-settings');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      const map: Record<string, string> = {};
      for (const row of rows) {
        if (row.key && row.key.startsWith('theme.')) {
          map[row.key] = row.value;
        }
      }
      setSettings(map);
    } catch {
      // silent — will use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Get effective value (setting or default)
  const get = useCallback((key: string): string => {
    return settings[key] ?? DEFAULTS[key] ?? '';
  }, [settings]);

  // Update a setting
  const handleChange = useCallback((key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Save all theme settings
  const saveSettings = useCallback(async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await adminFetch('/api/admin/game-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatusMsg({ text: '✅ Tema salvato con successo!', type: 'success' });
    } catch (err) {
      setStatusMsg({ text: `❌ Errore: ${err}`, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  }, [settings]);

  // Reset to defaults
  const resetDefaults = useCallback(() => {
    setSettings({});
    setStatusMsg({ text: '🔄 Ripristinato ai valori predefiniti', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  // Apply a preset
  const applyPreset = useCallback((preset: ThemePreset) => {
    setSettings(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(preset.settings)) {
        next[k] = v;
      }
      return next;
    });
    setStatusMsg({ text: `🎨 Preset "${preset.label}" applicato!`, type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  const previewStyles = usePreviewStyles(get);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400/50" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-emerald-400 mb-1 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Tema Gioco
            </h3>
            <p className="text-[13px] text-white/40">Personalizza colori, tipografia, interfaccia ed effetti visivi del gioco.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(prev => !prev)}
              className={`text-xs gap-1.5 border ${showPreview ? 'border-emerald-500/30 bg-emerald-600/10 text-emerald-300' : 'border-white/10 text-white/40 hover:text-white/60'}`}
            >
              {showPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showPreview ? 'Nascondi Anteprima' : 'Mostra Anteprima'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetDefaults}
              className="text-xs gap-1.5 border border-white/10 text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ripristina
            </Button>
          </div>
        </div>
      </div>

      {/* ── Status Message ── */}
      {statusMsg && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-[13px] font-medium shrink-0 ${
          statusMsg.type === 'success'
            ? 'bg-green-500/10 text-green-300 border border-green-500/20'
            : 'bg-red-500/10 text-red-300 border border-red-500/20'
        }`}>
          {statusMsg.text}
        </div>
      )}

      {/* ── Split Layout: Settings + Preview ── */}
      <div className={`flex-1 min-h-0 overflow-hidden ${showPreview ? 'flex' : 'block'}`}>
        {/* ── Left: Scrollable Settings ── */}
        <div className={`overflow-y-auto admin-scrollbar ${showPreview ? 'flex-1 min-w-0' : ''}`}>
          <div className="p-6 space-y-8">
            {/* ── Presets Section ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400/70" />
                <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">Preset Temi</h4>
                <span className="text-[11px] text-white/20">— clicca per applicare</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {THEME_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-left transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.04] cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{preset.icon}</span>
                      <span className="text-[12px] font-semibold text-white/60 group-hover:text-white/80 transition-colors">{preset.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {preset.colors.map((c, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border border-white/10"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Theme Settings Groups ── */}
            {THEME_GROUPS.map(group => (
              <div key={group.id} className="space-y-4">
                {/* Group header */}
                <div className="flex items-center gap-2">
                  <span className="text-sm">{group.icon}</span>
                  <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">{group.label}</h4>
                </div>

                {/* Settings grid — single column when preview is visible, two columns when hidden */}
                <div className={`grid gap-4 ${showPreview ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  {group.settings.map(def => (
                    <SettingControl
                      key={def.key}
                      def={def}
                      value={get(def.key)}
                      onChange={handleChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Sticky Preview Panel ── */}
        {showPreview && (
          <div className="w-[380px] shrink-0 border-l border-white/[0.06] bg-white/[0.01] overflow-y-auto admin-scrollbar">
            <div className="p-5">
              <PreviewPanel
                styles={previewStyles}
                hoverHighlight={get('theme.hoverHighlight')}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Footer ── */}
      <div className="shrink-0 px-6 py-3 border-t border-white/[0.06] bg-black/95 backdrop-blur">
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={saveSettings}
            disabled={saving}
            className="text-xs gap-2 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Salvando...' : 'Salva Tema'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Individual Setting Control ─────────────────────────────────────
interface SettingControlProps {
  def: ThemeSettingDef;
  value: string;
  onChange: (key: string, value: string) => void;
}

function SettingControl({ def, value, onChange }: SettingControlProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
      <label className="text-[13px] font-semibold text-white/60 block">
        {def.label}
      </label>
      <div className="flex items-center gap-2 font-mono text-[11px] text-white/20">
        {def.key}
      </div>

      {def.type === 'color' && (
        <div className="flex items-center gap-2 mt-1">
          <div className="relative">
            <input
              type="color"
              value={value || def.default}
              onChange={e => onChange(def.key, e.target.value)}
              className="w-9 h-9 rounded-lg border border-white/[0.12] bg-transparent cursor-pointer p-0.5"
            />
          </div>
          <input
            type="text"
            value={value || def.default}
            onChange={e => onChange(def.key, e.target.value)}
            placeholder="#000000"
            className="flex-1 text-[13px] bg-black/30 border border-white/[0.1] rounded-lg px-3 py-1.5 text-white/80 font-mono placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
        </div>
      )}

      {def.type === 'select' && (
        <select
          value={value || def.default}
          onChange={e => onChange(def.key, e.target.value)}
          className="w-full mt-1 bg-black/30 border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-emerald-500/40 transition-colors appearance-none cursor-pointer [&>option]:bg-[#1a1a2e] [&>option]:text-white"
        >
          {def.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {def.type === 'range' && (
        <div className="space-y-1 mt-1">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={def.min}
              max={def.max}
              step={def.step}
              value={value !== undefined && value !== '' ? safeParseFloat(value, safeParseFloat(def.default, 0)) : safeParseFloat(def.default, 0)}
              onChange={e => onChange(def.key, e.target.value)}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-[13px] font-mono text-emerald-400 min-w-[3.5rem] text-right">
              {value || def.default}{def.unit || ''}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-white/20">
            <span>{def.min}{def.unit || ''}</span>
            <span>{def.max}{def.unit || ''}</span>
          </div>
        </div>
      )}

      {def.type === 'toggle' && (
        <div className="flex items-center gap-3 mt-1">
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => onChange(def.key, String(checked))}
          />
          <span className="text-[12px] text-white/40">
            {value === 'true' ? 'Attivo' : 'Disattivo'}
          </span>
        </div>
      )}
    </div>
  );
}
