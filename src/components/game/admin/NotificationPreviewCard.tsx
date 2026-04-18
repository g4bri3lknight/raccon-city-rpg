'use client';

export function NotificationPreviewCard({ config }: { config: Record<string, unknown> }) {
  const cardBg = String(config.cardBg ?? '#1a1a2e');
  const borderColor = String(config.borderColor ?? '#333333');
  const titleColor = String(config.titleColor ?? '#ffffff');
  const titleGlow = String(config.titleGlow ?? 'none');
  const scanlineColor = String(config.scanlineColor ?? 'rgba(255,255,255,0.3)');
  const label = String(config.label ?? '');
  const icon = String(config.icon ?? '✨');
  const overlayBg = String(config.overlayBg ?? 'rgba(0,0,0,0.8)');
  const notifType = String(config.type ?? 'item_found');
  const notifId = String(config.id ?? 'notif_preview');

  // Type-specific sample text
  const SAMPLE_TEXTS: Record<string, { title: string; sub: string }> = {
    encounter: { title: 'Nemico Avvistato!', sub: 'Un mostro blocca la strada...' },
    victory: { title: 'Vittoria!', sub: 'Nemico sconfitto · Bottino ottenuto' },
    defeat: { title: 'Sconfitta...', sub: '"S.T.A.R.S...."' },
    item_found: { title: 'Oggetto Trovato', sub: 'Aggiunto all\'inventario' },
    bag_expand: { title: 'Zaino Espanso!', sub: 'Slot aggiunti: +4' },
    collectible_found: { title: 'Collezionabile!', sub: 'Pezzo raro trovato' },
  };
  const sample = SAMPLE_TEXTS[notifType] || { title: 'Messaggio di esempio', sub: 'Testo secondario opzionale' };

  // Image from DB if uploaded
  const imageRef = String(config.imageRef ?? '');
  const hasImage = imageRef.length > 0;

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: overlayBg }}>
      {/* Scanline */}
      <div
        className="absolute inset-x-0 top-1/2 h-[1px] opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${scanlineColor}, transparent)` }}
      />
      {/* Card */}
      <div
        className="relative mx-6 my-6 px-8 py-4 rounded-xl border text-center"
        style={{
          background: cardBg,
          borderColor: borderColor,
          boxShadow: `0 0 30px ${borderColor}40`,
        }}
      >
        {/* Icon or uploaded image */}
        {hasImage ? (
          <div className="flex justify-center mb-1">
            <div className="w-10 h-10 rounded-md overflow-hidden border border-white/10 bg-black/30">
              <img
                src={`/api/media/image?ref=${encodeURIComponent(imageRef)}`}
                alt="Notifica"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>
        ) : (
          <div className="text-2xl mb-1">{icon || '✨'}</div>
        )}
        {/* Label */}
        {label && (
          <div
            className="text-[10px] uppercase tracking-[0.2em] mb-0.5 opacity-70"
            style={{ color: titleColor }}
          >
            {label}
          </div>
        )}
        {/* Title */}
        <div
          className="font-black tracking-wider uppercase text-sm"
          style={{
            color: titleColor,
            textShadow: titleGlow === 'none' ? undefined : titleGlow,
            fontFamily: "'Courier New', monospace",
          }}
        >
          {sample.title}
        </div>
        {/* Sub message */}
        <div className="text-[12px] mt-1 text-gray-400">{sample.sub}</div>
        {/* Type badge */}
        <div className="mt-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/25 font-mono">
            {notifType}
          </span>
        </div>
      </div>
    </div>
  );
}
