'use client';

import { Eye } from 'lucide-react';

export function GalleryBanner({ type }: { type: 'sounds' | 'images' }) {
  return (
    <div className="mb-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
      <Eye className="w-4 h-4 text-white/25 shrink-0" />
      <p className="text-[13px] text-white/30">
        Galleria in <span className="text-white/50 font-medium">sola visualizzazione</span> — il caricamento dei file avviene direttamente nei dialog delle entità ({type === 'sounds' ? 'oggetti, nemici, location...' : 'oggetti, NPC, location...'})
      </p>
    </div>
  );
}
