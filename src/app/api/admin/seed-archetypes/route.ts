import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/admin/seed-archetypes — Seed default archetypes
 */
export async function POST() {
  try {
    const existing = await db.gameArchetype.count();
    if (existing > 0) {
      return NextResponse.json({
        message: `Già presenti ${existing} archetipi. Nessun seed eseguito.`,
        seeded: 0,
      });
    }

    const archetypes = await db.gameArchetype.createMany({
      data: [
        {
          name: 'tank',
          displayName: 'Tank',
          description: 'Specialista nella difesa e nell\'assorbimento danni. Protegge il gruppo.',
          maxHp: 150, atk: 10, def: 18, spd: 8,
          hpGrowth: 1.2, atkGrowth: 0.9, defGrowth: 1.3, spdGrowth: 0.8,
          specialId: 'shield_bash',
          special2Id: 'iron_wall',
          passiveName: 'Pelle di Ferro',
          passiveDescription: 'Riceve il 15% di danni in meno da tutti gli attacchi.',
          startingItems: JSON.stringify([{ itemId: 'pistol', quantity: 1 }, { itemId: 'bandage', quantity: 2 }]),
          portraitEmoji: '🛡️',
          sortOrder: 1,
        },
        {
          name: 'healer',
          displayName: 'Guaritore',
          description: 'Specialista nel supporto e nella cura. Mantiene il gruppo in vita.',
          maxHp: 90, atk: 8, def: 10, spd: 12,
          hpGrowth: 1.0, atkGrowth: 0.8, defGrowth: 0.9, spdGrowth: 1.1,
          specialId: 'heal_party',
          special2Id: 'purify',
          passiveName: 'Tocco Curativo',
          passiveDescription: 'Le cure ripristinano il 10% di HP aggiuntivo.',
          startingItems: JSON.stringify([{ itemId: 'herb_green', quantity: 3 }, { itemId: 'bandage', quantity: 2 }]),
          portraitEmoji: '💚',
          sortOrder: 2,
        },
        {
          name: 'dps',
          displayName: 'DPS',
          description: 'Specialista nell\'attacco e nei danni critici. Massima potenza offensiva.',
          maxHp: 100, atk: 20, def: 8, spd: 14,
          hpGrowth: 0.9, atkGrowth: 1.3, defGrowth: 0.7, spdGrowth: 1.2,
          specialId: 'headshot',
          special2Id: 'rapid_fire',
          passiveName: 'Punto Debole',
          passiveDescription: '+10% probabilità critico su tutti gli attacchi.',
          startingItems: JSON.stringify([{ itemId: 'shotgun', quantity: 1 }, { itemId: 'ammo_shotgun', quantity: 4 }]),
          portraitEmoji: '⚔️',
          sortOrder: 3,
        },
        {
          name: 'control',
          displayName: 'Controllo',
          description: 'Specialista nel debuff e nel controllo dei nemici. Manipola il campo di battaglia.',
          maxHp: 95, atk: 12, def: 10, spd: 12,
          hpGrowth: 1.0, atkGrowth: 1.0, defGrowth: 1.0, spdGrowth: 1.0,
          specialId: 'flashbang',
          special2Id: 'smoke_screen',
          passiveName: 'Tattico',
          passiveDescription: '+20% probabilità di applicare status alterati.',
          startingItems: JSON.stringify([{ itemId: 'grenade_flash', quantity: 2 }, { itemId: 'knife', quantity: 1 }]),
          portraitEmoji: '🎯',
          sortOrder: 4,
        },
        {
          name: 'custom',
          displayName: 'Personalizzato',
          description: 'Archetipo personalizzabile. Distribuisci i punti stat liberamente.',
          maxHp: 100, atk: 12, def: 10, spd: 10,
          hpGrowth: 1.0, atkGrowth: 1.0, defGrowth: 1.0, spdGrowth: 1.0,
          passiveName: '',
          passiveDescription: '',
          startingItems: JSON.stringify([{ itemId: 'pipe', quantity: 1 }, { itemId: 'bandage', quantity: 2 }]),
          portraitEmoji: '🎮',
          sortOrder: 99,
        },
      ],
    });

    return NextResponse.json({
      message: `${archetypes.count} archetipi creati con successo!`,
      seeded: archetypes.count,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Errore seed archetipi: ${msg}` }, { status: 500 });
  }
}
