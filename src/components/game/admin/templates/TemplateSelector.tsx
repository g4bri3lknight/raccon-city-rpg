'use client';

import { BUILT_IN_TEMPLATES } from './index';
import type { GameTemplateDef } from './index';

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
}

/** Get a few representative system icons for the template preview. */
function getSystemBadges(template: GameTemplateDef): string[] {
  const badges: string[] = [];
  const s = template.config.systems;
  if (s.limitedSaves) badges.push('💾 Salvataggi');
  if (s.persistentPursuer) badges.push('😱 Pursuer');
  if (s.crafting) badges.push('🧪 Craft');
  if (s.partySystem) badges.push('👥 Party');
  if (s.bossPhases) badges.push('👑 Boss');
  if (s.questChains) badges.push('📜 Quest');
  if (s.secretRooms) badges.push('🚪 Segrete');
  return badges.slice(0, 4);
}

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-sm font-bold text-white/90 tracking-tight">
          Scegli un template per iniziare
        </h3>
        <p className="mt-1 text-[12px] text-white/40 leading-relaxed">
          Il template definisce le meccaniche di base, i tipi di dati, i sistemi e il tema visivo.
        </p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BUILT_IN_TEMPLATES.map((template: GameTemplateDef) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className="group relative rounded-xl border border-white/[0.1] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:bg-white/[0.04] hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            style={{
              borderTop: `3px solid ${template.color}`,
              boxShadow: `0 0 0 0 ${template.color}`,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = `${template.color}4D`;
              el.style.boxShadow = `0 4px 20px -4px ${template.color}33`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = 'rgba(255,255,255,0.1)';
              el.style.boxShadow = 'none';
            }}
          >
            {/* Top row: icon + name */}
            <div className="flex items-start gap-3">
              <div
                className="text-3xl shrink-0 w-10 h-10 flex items-center justify-center rounded-lg"
                style={{ backgroundColor: `${template.color}15` }}
              >
                {template.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white/90 leading-tight">{template.name}</div>
                <div className="mt-0.5 text-[11px] text-white/40">
                  {template.gameType}{template.setting ? ` · ${template.setting}` : ''}
                </div>
              </div>
            </div>

            {/* Description */}
            {template.description && (
              <div className="mt-2 text-[11px] text-white/50 leading-relaxed line-clamp-2">
                {template.description}
              </div>
            )}

            {/* Theme preview swatch + system badges */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {/* Color swatch */}
              <div
                className="w-3 h-3 rounded-full shrink-0 border border-white/10"
                style={{ backgroundColor: template.color }}
                title={`Tema: ${template.themePreset['theme.primaryColor']}`}
              />
              {/* System badges */}
              {getSystemBadges(template).map((badge) => (
                <span
                  key={badge}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-white/30 border border-white/[0.06]"
                >
                  {badge}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
