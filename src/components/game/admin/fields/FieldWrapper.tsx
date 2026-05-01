'use client';

import type { FieldDef } from '../config/fieldDefinitions';
import { AdminTooltip } from './AdminTooltip';

// ═══════════════════════════════════════════════════════════════
// FieldWrapper — shared label + grid width wrapper for all fields
// ═══════════════════════════════════════════════════════════════

/** Field types that should span the full 3-column grid width */
const FULL_WIDTH_TYPES: Set<string> = new Set([
  'textarea',
  'tag-editor',
  'entity-tag-editor',
  'item-pool',
  'text-list',
  'locked-locs',
  'sub-areas',
  'story-event',
  'status-apply',
  'status-cured',
  'quest-rewards',
  'event-choices',
  'rich-text-editor',
  'trade-inventory',
  'starting-items',
  'effects-editor',
  'item-box-defaults',
  'requirements-editor',
]);

/** Returns true if a field type should span all 3 columns */
export function isFullWidthField(f: FieldDef): boolean {
  return FULL_WIDTH_TYPES.has(f.type) || f.colSpan === 3;
}

/** Returns the CSS class for grid column span (responsive: 1/2/3 cols) */
export function getFieldColClass(f: FieldDef): string {
  const full = isFullWidthField(f);
  const double = !full && f.colSpan === 2;
  if (full) return 'md:col-span-2 lg:col-span-3';
  if (double) return 'md:col-span-2';
  return '';
}

export interface FieldWrapperProps {
  field: FieldDef;
  children: React.ReactNode;
  /** If true, show a dimmed/disabled label style (for read-only ID) */
  dimmed?: boolean;
}

export function FieldWrapper({ field, children, dimmed }: FieldWrapperProps) {
  const colClass = getFieldColClass(field);

  return (
    <div className={colClass}>
      <label className={`text-xs mb-1 block font-medium ${dimmed ? 'text-white/40' : 'text-white/60'}`}>
        {field.label} {field.required && !dimmed && <span className="text-red-400">*</span>}
        {field.helpText && <AdminTooltip text={field.helpText} showIcon={false} className="ml-1" />}
      </label>
      {children}
    </div>
  );
}
