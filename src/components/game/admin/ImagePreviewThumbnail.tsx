'use client';

import { useState } from 'react';
import { ImageIcon, Eye, X } from 'lucide-react';

export function ImagePreviewThumbnail({ imageId, hasFile, altText }: { imageId: string; hasFile: boolean; altText: string }) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!hasFile) {
    return (
      <div className="w-10 h-10 rounded-md bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
        <ImageIcon className="w-3.5 h-3.5 text-white/10" />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowLightbox(true)}
        className="w-10 h-10 rounded-md overflow-hidden border border-white/[0.08] hover:border-white/20 transition-colors"
        title={altText || 'Visualizza immagine'}
      >
        {!imgError ? (
          <img
            src={`/api/media/image?ref=${encodeURIComponent(imageId)}`}
            alt={altText || imageId}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-white/[0.02] flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-white/20" />
          </div>
        )}
      </button>
      {showLightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-3xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-10 right-0 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={`/api/media/image?ref=${encodeURIComponent(imageId)}`}
              alt={altText || imageId}
              className="max-w-full max-h-[75vh] rounded-lg border border-white/[0.1] shadow-2xl"
            />
            <p className="text-xs text-white/40 text-center mt-2 font-mono">{imageId}</p>
          </div>
        </div>
      )}
    </>
  );
}
