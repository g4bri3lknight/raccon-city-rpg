'use client';

import { CloudUpload } from 'lucide-react';
import type { MediaUploadDef } from '../shared';
import { MediaUploadBox } from '../MediaUploadBox';

// ═══════════════════════════════════════════════════════════════
// MediaUploadsSection — renders media upload boxes for an entity
// ═══════════════════════════════════════════════════════════════

export interface MediaUploadsSectionProps {
  mediaUploads: MediaUploadDef[];
  entityId: string | null;
}

export function MediaUploadsSection({ mediaUploads, entityId }: MediaUploadsSectionProps) {
  if (!mediaUploads || mediaUploads.length === 0) return null;

  return (
    <div className="mt-2 pt-3 border-t border-white/[0.06]">
      <div className="flex items-center gap-2 mb-3">
        <CloudUpload className="w-3.5 h-3.5 text-white/30" />
        <span className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">Media Upload</span>
        <span className="text-[11px] text-white/15">— immagini e suoni associati a questa entità</span>
      </div>
      <div className="space-y-3">
        {mediaUploads.map(mu => (
          <MediaUploadBox
            key={mu.key}
            config={mu}
            entityId={entityId}
          />
        ))}
      </div>
    </div>
  );
}
