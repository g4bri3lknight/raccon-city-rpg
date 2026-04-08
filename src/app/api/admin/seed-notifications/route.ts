import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Default notification configs matching the hardcoded THEMES in GameNotification.tsx
const DEFAULTS = [
  {
    id: 'notif_encounter',
    type: 'encounter',
    label: '⚠ INCONTRO ⚠',
    icon: '',
    cardBg: '#3c0505',
    borderColor: '#c81e1e',
    titleColor: '#fca5a5',
    titleGlow: '0 0 30px rgba(239,68,68,0.7), 0 0 60px rgba(220,38,38,0.3)',
    overlayBg: 'rgba(180,20,20,0.5)',
    scanlineColor: 'rgba(255,60,60,0.9)',
    shake: true,
    duration: 2200,
    sortOrder: 0,
  },
  {
    id: 'notif_victory',
    type: 'victory',
    label: '',
    icon: '',
    cardBg: '#190c08',
    borderColor: '#785028',
    titleColor: '#c9a06a',
    titleGlow: '0 0 20px rgba(160,120,60,0.5), 0 0 40px rgba(100,60,20,0.2)',
    overlayBg: 'rgba(60,40,30,0.35)',
    scanlineColor: 'rgba(180,140,80,0.5)',
    shake: false,
    duration: 3200,
    sortOrder: 1,
  },
  {
    id: 'notif_defeat',
    type: 'defeat',
    label: '',
    icon: '',
    cardBg: '#140505',
    borderColor: '#7f1d1d',
    titleColor: '#7f1d1d',
    titleGlow: '0 0 30px rgba(220,38,38,0.6), 0 0 60px rgba(127,29,29,0.3)',
    overlayBg: 'rgba(100,10,10,0.6)',
    scanlineColor: 'rgba(180,20,20,0.7)',
    shake: true,
    duration: 3200,
    sortOrder: 2,
  },
  {
    id: 'notif_item_found',
    type: 'item_found',
    label: 'TROVATO',
    icon: '',
    cardBg: '#0a281e',
    borderColor: '#22c55e',
    titleColor: '#86efac',
    titleGlow: '0 0 20px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.2)',
    overlayBg: 'rgba(30,80,60,0.35)',
    scanlineColor: 'rgba(74,222,128,0.6)',
    shake: false,
    duration: 2000,
    sortOrder: 3,
  },
  {
    id: 'notif_bag_expand',
    type: 'bag_expand',
    label: '',
    icon: '',
    cardBg: '#0a1e2d',
    borderColor: '#22d3ee',
    titleColor: '#67e8f9',
    titleGlow: '0 0 18px rgba(34,211,238,0.5)',
    overlayBg: 'rgba(20,60,80,0.35)',
    scanlineColor: 'rgba(103,232,249,0.6)',
    shake: false,
    duration: 2500,
    sortOrder: 4,
  },
  {
    id: 'notif_collectible_found',
    type: 'collectible_found',
    label: 'COLLEZIONABILE',
    icon: '',
    cardBg: '#1e0f28',
    borderColor: '#a855f7',
    titleColor: '#d8b4fe',
    titleGlow: '0 0 25px rgba(168,85,247,0.6), 0 0 50px rgba(126,34,206,0.3)',
    overlayBg: 'rgba(100,60,120,0.4)',
    scanlineColor: 'rgba(192,132,252,0.7)',
    shake: false,
    duration: 2500,
    sortOrder: 5,
  },
];

export async function POST() {
  try {
    let created = 0;
    let updated = 0;
    for (const def of DEFAULTS) {
      const existing = await db.notificationConfig.findUnique({ where: { id: def.id } });
      if (existing) {
        await db.notificationConfig.update({ where: { id: def.id }, data: def });
        updated++;
      } else {
        await db.notificationConfig.create({ data: def });
        created++;
      }
    }
    return NextResponse.json({
      success: true,
      message: `Seede completato: ${created} creati, ${updated} aggiornati`,
      created,
      updated,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
