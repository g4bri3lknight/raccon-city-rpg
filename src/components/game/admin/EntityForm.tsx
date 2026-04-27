'use client';

import { useState } from 'react';
import type { TabId } from './config/tabGroups';
import type { FieldDef } from './config/fieldDefinitions';
import { MEDIA_UPLOADS } from './shared';
import { getFieldColClass } from './fields';
import { AdminTooltip } from './fields/AdminTooltip';

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
// FieldContainer — wraps composite fields with label + grid span
// (Basic fields like TextField, SelectField etc. use FieldWrapper
// internally, but composite editors need external wrapping)
// ═══════════════════════════════════════════════════════════════
function FieldContainer({ field, children }: { field: FieldDef; children: React.ReactNode }) {
  const colClass = getFieldColClass(field);
  return (
    <div className={colClass}>
      <label className="text-[12px] text-white/50 mb-0.5 block font-medium">
        {field.label} {field.required && <span className="text-red-400">*</span>}
        {field.helpText && <AdminTooltip text={field.helpText} showIcon={false} className="ml-1" />}
      </label>
      {children}
    </div>
  );
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
}: {
  fields: FieldDef[];
  initialData: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  submitLabel: string;
  isEdit: boolean;
  activeTab: TabId;
}) {
  const [data, setData] = useState<Record<string, unknown>>({ ...initialData });
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
      return (
        <FieldContainer key={f.key} field={f}>
          <EntitySearchInput
            value={String(val)}
            onChange={v => handleChange(f.key, v)}
            endpoint={f.entitySearchEndpoint ?? ''}
            labelKey={f.entitySearchLabelKey ?? 'name'}
            iconKey={f.entityIconKey}
            placeholder={f.placeholder}
          />
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
    <form id="entity-form" onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
        {fields.map(renderField)}
      </div>

      <MediaUploadsSection
        mediaUploads={mediaUploads}
        entityId={typeof data.id === 'string' && data.id.trim() ? data.id.trim() : null}
      />
    </form>
  );
}
