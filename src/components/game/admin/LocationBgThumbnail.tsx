'use client';

import { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

export function LocationBgThumbnail({ locationId }: { locationId: string }) {
  const [hasBg, setHasBg] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageId = `bg_${locationId}`;

  useEffect(() => {
    // Check if image exists in DB
    adminFetch('/api/admin/images')
      .then(res => res.json())
      .then(items => {
        const found = Array.isArray(items) && items.some((r: Record<string, unknown>) => r.id === imageId && r.data);
        setHasBg(found);
      })
      .catch(() => setHasBg(false));
  }, [imageId]);

  if (!hasBg) {
    return (
      <div className="w-16 h-10 rounded-md bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
        <ImageIcon className="w-3.5 h-3.5 text-white/10" />
      </div>
    );
  }

  return (
    <div
      className="w-16 h-10 rounded-md overflow-hidden border border-white/[0.08]"
      style={{ backgroundImage: `url('/api/media/image?id=${encodeURIComponent(imageId)}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      onError={() => setImgError(true)}
    />
  );
}
