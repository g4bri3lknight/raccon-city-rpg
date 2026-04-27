'use client';

import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// FormActions — submit and cancel buttons for entity forms
// ═══════════════════════════════════════════════════════════════

export interface FormActionsProps {
  submitLabel: string;
  onCancel: () => void;
  /** HTML form id to associate the submit button with (for sticky footer pattern) */
  formId?: string;
}

export function FormActions({ submitLabel, onCancel, formId }: FormActionsProps) {
  return (
    <div className="flex gap-3">
      <Button
        type="submit"
        form={formId}
        className="flex-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200"
      >
        <Save className="w-3.5 h-3.5" />
        {submitLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        className="flex-1 text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
      >
        Annulla
      </Button>
    </div>
  );
}
