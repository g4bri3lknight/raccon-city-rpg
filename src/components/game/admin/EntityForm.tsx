'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Link2, Shield, Swords, Heart, Zap, Info } from 'lucide-react';
import type { TabId } from './config/tabGroups';
import type { FieldDef } from './config/fieldDefinitions';
import { MEDIA_UPLOADS } from './shared';
import { getFieldColClass } from './fields';
import { EntityLinkPreview } from './EntityLinkPreview';
import { AdminTooltip } from './fields/AdminTooltip';
import { getSectionsForTab } from './config/fieldSections';
import { adminFetch } from '@/lib/admin-fetch';

// Field editor components
import {
  TextField,
  TextareaField,
  SelectField,
  BooleanField,
  IdField,
  EntitySearchInput,
  EntityTagEditor,
  TagEditor,
  ItemPoolEditor,
  ItemBoxDefaultsEditor,
  QuestRewardsEditor,
  TradeInventoryEditor,
  StartingItemsEditor,
  TextListEditor,
  RichTextEditor,
  LockedLocsEditor,
  SubAreasEditor,
  EffectsArrayEditor,
  StatusApplyEditor,
  StatusCuredEditor,
  EventChoicesEditor,
  StoryEventEditor,
  RequirementsEditor,
  MediaUploadsSection,
  QuestChainsEditor,
  QuestChainFinalRewardEditor,
  JsonEditor,
  DynamicDialoguesEditor,
  PermanentMapEffectEditor,
} from './fields';

// Re-export ItemBoxDefaultsEditor for external consumers (GameSettingsEditor)
export { ItemBoxDefaultsEditor } from './fields';

// ═══════════════════════════════════════════════════════════════
// Archetype Inherit Banner — shows inherited stats when archetypeId is set
// ═══════════════════════════════════════════════════════════════
function ArchetypeInheritBanner({ archetypeId }: { archetypeId: string }) {
  const [archetype, setArchetype] = useState<{
    name: string; displayName: string; portraitEmoji: string;
    maxHp: number; atk: number; def: number; spd: number;
    passiveName: string; passiveDescription: string;
    specialId: string; special2Id: string;
    startingItems: string;
  } | null>(null);
  const [itemNames, setItemNames] = useState<Record<string, { name: string; icon?: string }>>({});

  useEffect(() => {
    let cancelled = false;
    if (!archetypeId) return;
    (async () => {
      try {
        const [archRes, itemRes] = await Promise.all([
          adminFetch('/api/admin/archetypes'),
          adminFetch('/api/admin/items'),
        ]);
        if (cancelled) return;

        // Resolve archetype
        if (archRes.ok) {
          const list = await archRes.json();
          const found = list.find((a: { id: string }) => a.id === archetypeId);
          if (found && !cancelled) setArchetype(found);
        }

        // Build item lookup map
        if (itemRes.ok) {
          const items = await itemRes.json();
          const map: Record<string, { name: string; icon?: string }> = {};
          for (const it of items) {
            map[it.id] = { name: it.name || it.id, icon: it.icon || it.emoji || '' };
          }
          if (!cancelled) setItemNames(map);
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [archetypeId]);

  if (!archetype) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <Link2 className="w-4 h-4" />
          <span className="font-medium">Archetipo selezionato: {archetypeId}</span>
        </div>
        <p className="text-emerald-300/50 text-xs mt-1">Il personaggio erediterà statistiche, abilità e passiva da questo archetipo.</p>
      </div>
    );
  }

  const startingItems = (() => {
    try { return JSON.parse(archetype.startingItems || '[]'); } catch { return []; }
  })();

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-emerald-400">
        <Link2 className="w-4 h-4" />
        <span className="font-semibold text-sm">Eredita da: {archetype.displayName || archetype.name}</span>
        <span className="text-lg">{archetype.portraitEmoji}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <Heart className="w-3 h-3 text-red-400" />
          <span className="text-white/40">HP</span>
          <span className="text-white/70 font-mono">{archetype.maxHp}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Swords className="w-3 h-3 text-amber-400" />
          <span className="text-white/40">ATK</span>
          <span className="text-white/70 font-mono">{archetype.atk}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Shield className="w-3 h-3 text-green-400" />
          <span className="text-white/40">DEF</span>
          <span className="text-white/70 font-mono">{archetype.def}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Zap className="w-3 h-3 text-purple-400" />
          <span className="text-white/40">SPD</span>
          <span className="text-white/70 font-mono">{archetype.spd}</span>
        </div>
      </div>

      {archetype.passiveDescription && (
        <div className="text-xs text-white/30 italic">✦ {archetype.passiveName ? `${archetype.passiveName}: ` : ''}{archetype.passiveDescription}</div>
      )}

      {startingItems.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-white/30 font-medium">🎒 Oggetti iniziali ereditati ({startingItems.length})</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {startingItems.map((entry: { itemId: string; quantity?: number; isEquipped?: boolean }, i: number) => {
              const resolved = itemNames[entry.itemId];
              const label = resolved?.name || entry.itemId;
              const icon = resolved?.icon || '';
              const qty = entry.quantity > 1 ? ` ×${entry.quantity}` : '';
              const equipBadge = entry.isEquipped ? (
                <span className="text-[9px] px-1 py-0 rounded bg-amber-500/15 text-amber-400/70 ml-0.5">equip</span>
              ) : null;
              return (
                <span key={entry.itemId + '-' + i} className="inline-flex items-center gap-1 text-[11px] text-white/50">
                  <span>{icon}</span>
                  <span>{label}</span>
                  <span className="text-white/30">{qty}</span>
                  {equipBadge}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-emerald-300/40 text-[11px] flex items-center gap-1">
        <Info className="w-3 h-3" />
        Le sezioni Statistiche, Abilità, Passiva e Equipaggiamento sono nascoste perché ereditate.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FieldContainer — wraps composite fields with label + grid span
// (Basic fields like TextField, SelectField etc. use FieldWrapper
// internally, but composite editors need external wrapping)
// ═══════════════════════════════════════════════════════════════
function FieldContainer({ field, children }: { field: FieldDef; children: React.ReactNode }) {
  const colClass = getFieldColClass(field);
  return (
    <div className={colClass}>
      <label className="text-xs text-white/60 mb-1 block font-medium">
        {field.label} {field.required && <span className="text-red-400">*</span>}
        {field.helpText && <AdminTooltip text={field.helpText} showIcon={false} className="ml-1" />}
      </label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Helper: derive a tabId from field key or endpoint
// ═══════════════════════════════════════════════════════════════
function deriveTabId(fieldKey: string, endpoint?: string): string {
  const keyMap: Record<string, string> = {
    npcId: 'npcs',
    locationId: 'locations',
    questId: 'quests',
    targetId: 'items',
    enemyId: 'enemies',
    itemId: 'items',
    bossId: 'enemies',
    specialId: 'specials',
    special2Id: 'specials',
    archetypeId: 'archetypes',
    characterId: 'characters',
    documentId: 'documents',
    endingId: 'endings',
    requiredDocumentId: 'documents',
    requiredNpcQuestId: 'quests',
    uniqueItemId: 'items',
    resultItemId: 'items',
    chainId: 'quest-chains',
    nextEventId: 'events',
  };
  if (keyMap[fieldKey]) return keyMap[fieldKey];
  if (endpoint) {
    const match = endpoint.match(/\/api\/admin\/(\w[\w-]*)/);
    if (match) return match[1];
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════
// Entity Form (for create/edit dialog)
// ═══════════════════════════════════════════════════════════════
export function EntityForm({
  fields,
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  isEdit,
  activeTab,
  onNavigate,
}: {
  fields: FieldDef[];
  initialData: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  submitLabel: string;
  isEdit: boolean;
  activeTab: TabId;
  onNavigate?: (tabId: string, entityId: string) => void;
}) {
  const [data, setData] = useState<Record<string, unknown>>({ ...initialData });
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const sections = getSectionsForTab(activeTab, fields);
    const initial: Record<string, boolean> = {};
    // Auto-collapse all sections except the first
    sections.forEach((s, i) => { initial[s.id] = i > 0; });
    return initial;
  });
  const mediaUploads = MEDIA_UPLOADS[activeTab];

  const handleChange = (key: string, value: unknown) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  const renderField = (f: FieldDef) => {
    const val = data[f.key] ?? f.defaultValue ?? '';

    // ID field is read-only in edit mode
    if (isEdit && f.key === 'id') {
      return <IdField key={f.key} field={f} value={val} />;
    }

    // Basic fields (use FieldWrapper internally)
    if (f.type === 'text' || f.type === 'number') {
      return <TextField key={f.key} field={f} value={val} onChange={handleChange} />;
    }
    if (f.type === 'textarea') {
      return <TextareaField key={f.key} field={f} value={val} onChange={handleChange} />;
    }
    if (f.type === 'select') {
      return <SelectField key={f.key} field={f} value={val} onChange={handleChange} />;
    }
    if (f.type === 'boolean') {
      return <BooleanField key={f.key} field={f} value={val} onChange={handleChange} />;
    }

    // Composite fields (need external FieldContainer wrapper)
    if (f.type === 'entity-search') {
      const targetTabId = deriveTabId(f.key, f.entitySearchEndpoint);
      return (
        <FieldContainer key={f.key} field={f}>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <EntitySearchInput
                value={String(val)}
                onChange={v => handleChange(f.key, v)}
                endpoint={f.entitySearchEndpoint ?? ''}
                labelKey={f.entitySearchLabelKey ?? 'name'}
                iconKey={f.entityIconKey}
                placeholder={f.placeholder}
              />
            </div>
            {val && targetTabId && onNavigate && (
              <EntityLinkPreview
                value={String(val)}
                endpoint={f.entitySearchEndpoint ?? ''}
                labelKey={f.entitySearchLabelKey ?? 'name'}
                iconKey={f.entityIconKey}
                tabId={targetTabId}
                onNavigate={onNavigate}
              />
            )}
          </div>
        </FieldContainer>
      );
    }

    if (f.type === 'tag-editor') {
      return (
        <FieldContainer key={f.key} field={f}>
          <TagEditor value={val} onChange={v => handleChange(f.key, v)} placeholder={f.placeholder} />
        </FieldContainer>
      );
    }

    if (f.type === 'entity-tag-editor') {
      return (
        <FieldContainer key={f.key} field={f}>
          <EntityTagEditor
            value={val}
            onChange={v => handleChange(f.key, v)}
            endpoint={f.entitySearchEndpoint ?? ''}
            labelKey={f.entitySearchLabelKey ?? 'name'}
            iconKey={f.entityIconKey}
            placeholder={f.placeholder}
          />
        </FieldContainer>
      );
    }

    if (f.type === 'item-pool') {
      return (
        <FieldContainer key={f.key} field={f}>
          <ItemPoolEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'text-list') {
      return (
        <FieldContainer key={f.key} field={f}>
          <TextListEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'locked-locs') {
      return (
        <FieldContainer key={f.key} field={f}>
          <LockedLocsEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'sub-areas') {
      return (
        <FieldContainer key={f.key} field={f}>
          <SubAreasEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'story-event') {
      return (
        <FieldContainer key={f.key} field={f}>
          <StoryEventEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'status-apply') {
      return (
        <FieldContainer key={f.key} field={f}>
          <StatusApplyEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'status-cured') {
      return (
        <FieldContainer key={f.key} field={f}>
          <StatusCuredEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'effects-editor') {
      return (
        <FieldContainer key={f.key} field={f}>
          <EffectsArrayEditor value={val} onChange={v => handleChange(f.key, v)} showTrigger={activeTab === 'items'} />
        </FieldContainer>
      );
    }

    if (f.type === 'quest-rewards') {
      return (
        <FieldContainer key={f.key} field={f}>
          <QuestRewardsEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'event-choices') {
      return (
        <FieldContainer key={f.key} field={f}>
          <EventChoicesEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'rich-text-editor') {
      return (
        <FieldContainer key={f.key} field={f}>
          <RichTextEditor value={typeof val === 'string' ? val : ''} onChange={v => handleChange(f.key, v)} placeholder={f.placeholder} />
        </FieldContainer>
      );
    }

    if (f.type === 'trade-inventory') {
      return (
        <FieldContainer key={f.key} field={f}>
          <TradeInventoryEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'starting-items') {
      return (
        <FieldContainer key={f.key} field={f}>
          <StartingItemsEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'item-box-defaults') {
      return (
        <FieldContainer key={f.key} field={f}>
          <ItemBoxDefaultsEditor value={typeof val === 'string' ? val : JSON.stringify(val)} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'requirements-editor') {
      return (
        <FieldContainer key={f.key} field={f}>
          <RequirementsEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'quest-chain-steps') {
      return (
        <FieldContainer key={f.key} field={f}>
          <QuestChainsEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'quest-chain-final-reward') {
      return (
        <FieldContainer key={f.key} field={f}>
          <QuestChainFinalRewardEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'dynamic-dialogues') {
      return (
        <FieldContainer key={f.key} field={f}>
          <DynamicDialoguesEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'permanent-map-effect') {
      return (
        <FieldContainer key={f.key} field={f}>
          <PermanentMapEffectEditor value={val} onChange={v => handleChange(f.key, v)} />
        </FieldContainer>
      );
    }

    if (f.type === 'json') {
      return (
        <FieldContainer key={f.key} field={f}>
          <JsonEditor
            value={val}
            onChange={v => handleChange(f.key, v)}
          />
        </FieldContainer>
      );
    }

    // Fallback: treat as text field
    return <TextField key={f.key} field={f} value={val} onChange={handleChange} />;
  };

  return (
    <form id="entity-form" onSubmit={handleSubmit} className="space-y-4">
      {(() => {
        const sections = getSectionsForTab(activeTab, fields, data);
        const fieldMap = new Map(fields.map(f => [f.key, f]));

        // Only one section with no config → flat layout (no accordion)
        if (sections.length === 1 && sections[0].fieldKeys.length === 0) {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
              {fields.map(renderField)}
            </div>
          );
        }

        return (
          <div className="space-y-1">
            {sections.map(section => {
              const isCollapsed = collapsedSections[section.id] ?? false;
              const sectionFields = section.fieldKeys
                .map(key => fieldMap.get(key))
                .filter(Boolean) as FieldDef[];

              // Special: archetype-inherit section shows banner instead of fields
              if (section.id === 'archetype-inherit') {
                const archetypeId = String(data.archetypeId || '');
                if (!archetypeId) return null;
                return (
                  <div key={section.id}>
                    <ArchetypeInheritBanner archetypeId={archetypeId} />
                  </div>
                );
              }

              if (sectionFields.length === 0) return null;

              return (
                <div key={section.id} className="border border-white/[0.06] rounded-lg">
                  <div className="overflow-hidden rounded-t-lg">
                    <button
                      type="button"
                      onClick={() => setCollapsedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="text-sm">{section.icon}</span>
                      <span className="text-[13px] font-semibold text-white/60">{section.label}</span>
                      <span className="text-[11px] text-white/20 ml-1">{sectionFields.length}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-white/30 ml-auto transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                  </div>
                  {!isCollapsed && (
                    <div className="px-4 pb-4 pt-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                        {sectionFields.map(renderField)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      <MediaUploadsSection
        mediaUploads={mediaUploads}
        entityId={typeof data.id === 'string' && data.id.trim() ? data.id.trim() : null}
      />
    </form>
  );
}
