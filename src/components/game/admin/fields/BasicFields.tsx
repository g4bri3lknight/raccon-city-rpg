'use client';

import type { FieldDef } from '../config/fieldDefinitions';
import { FieldWrapper } from './FieldWrapper';

// ═══════════════════════════════════════════════════════════════
// TextField — simple text/number input field
// ═══════════════════════════════════════════════════════════════

export interface TextFieldProps {
  field: FieldDef;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

export function TextField({ field, value, onChange }: TextFieldProps) {
  const isNumber = field.type === 'number';
  const step = isNumber && typeof field.defaultValue === 'number' && field.defaultValue % 1 !== 0 ? '0.1' : isNumber ? '1' : undefined;

  return (
    <FieldWrapper field={field}>
      <input
        type={isNumber ? 'number' : 'text'}
        step={step}
        value={value as string | number}
        onChange={e => {
          const raw = e.target.value;
          onChange(field.key, isNumber ? (raw === '' ? '' : Number(raw)) : raw);
        }}
        placeholder={field.placeholder}
        className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
      />
    </FieldWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════
// TextareaField — multi-line text input field
// ═══════════════════════════════════════════════════════════════

export interface TextareaFieldProps {
  field: FieldDef;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

export function TextareaField({ field, value, onChange }: TextareaFieldProps) {
  return (
    <FieldWrapper field={field}>
      <textarea
        value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        onChange={e => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        className="w-full text-[13px] bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 resize-y font-mono"
      />
    </FieldWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════
// SelectField — dropdown select with enum label support
// ═══════════════════════════════════════════════════════════════

import { getEnumLabel, getEnumHint } from '../config/enumLabels';

export interface SelectFieldProps {
  field: FieldDef;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

export function SelectField({ field, value, onChange }: SelectFieldProps) {
  return (
    <FieldWrapper field={field}>
      <select
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(field.key, e.target.value)}
        className="w-full text-[13px] bg-emerald-950/40 text-emerald-300/80 border border-emerald-500/20 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
      >
        <option value="" className="bg-black text-white">— Nessuno —</option>
        {field.options?.map(opt => {
          const label = field.enumGroup ? getEnumLabel(field.enumGroup, opt) : opt;
          const hint = field.enumGroup ? getEnumHint(field.enumGroup, opt) : undefined;
          const isIcon = /^[\p{Emoji}\p{Emoji_Presentation}\u200D\uFE0F]/u.test(opt);
          const displayText = isIcon || label === opt ? label : `${label} (${opt})`;
          return (
            <option key={opt} value={opt} className="bg-black text-white" title={hint}>
              {displayText}
            </option>
          );
        })}
      </select>
    </FieldWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════
// BooleanField — checkbox toggle field
// ═══════════════════════════════════════════════════════════════

export interface BooleanFieldProps {
  field: FieldDef;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

export function BooleanField({ field, value, onChange }: BooleanFieldProps) {
  return (
    <FieldWrapper field={field}>
      <label className="flex items-center gap-2 cursor-pointer py-1.5">
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(field.key, e.target.checked)}
          className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.2] text-emerald-500 focus:ring-emerald-500/50 accent-emerald-500"
        />
        <span className="text-[12px] text-white/50">{value ? 'Sì' : 'No'}</span>
      </label>
    </FieldWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════
// IdField — read-only ID field (shown in edit mode)
// ═══════════════════════════════════════════════════════════════

export interface IdFieldProps {
  field: FieldDef;
  value: unknown;
}

export function IdField({ field, value }: IdFieldProps) {
  return (
    <FieldWrapper field={field} dimmed>
      <input
        type="text"
        value={String(value)}
        disabled
        className="w-full text-[13px] bg-white/[0.02] border border-white/[0.06] rounded px-2 py-1.5 text-white/30 font-mono cursor-not-allowed"
      />
    </FieldWrapper>
  );
}
