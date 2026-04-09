import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ENEMIES as STATIC_ENEMIES } from '@/game/data/enemies';

type SeedResult = { entity: string; total: number; created: number; updated: number };

// Slugify: lowercase, replace accents, spaces→underscores, remove special chars
function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// EnemyAbility signature for dedup
function abilityKey(a: { name: string; power: number; statusEffect?: { type: string; chance: number; duration?: number } }): string {
  return `${a.name}|${a.power}|${a.statusEffect?.type ?? ''}|${a.statusEffect?.chance ?? 0}|${a.statusEffect?.duration ?? 0}`;
}

export async function POST() {
  try {
    // Extract all abilities from static enemies
    const seen = new Map<string, { slug: string; count: number }>();
    const abilities: Array<{
      id: string;
      name: string;
      description: string;
      power: number;
      chance: number;
      statusType: string;
      statusChance: number;
      statusDuration: number;
    }> = [];

    for (const enemy of Object.values(STATIC_ENEMIES)) {
      for (const ab of enemy.abilities) {
        const key = abilityKey(ab);
        if (seen.has(key)) continue;

        let slug = slugify(ab.name);
        // Ensure uniqueness: if slug already used, append suffix
        const existing = seen.get(slug);
        if (existing) {
          // Same slug but different ability — append a suffix
          existing.count++;
          slug = `${slug}_v${existing.count}`;
        }
        seen.set(key, { slug, count: 1 });

        abilities.push({
          id: slug,
          name: ab.name,
          description: ab.description ?? '',
          power: ab.power,
          chance: ab.chance ?? 50,
          statusType: ab.statusEffect?.type ?? '',
          statusChance: ab.statusEffect?.chance ?? 0,
          statusDuration: ab.statusEffect?.duration ?? 0,
        });
      }
    }

    // Also add boss phase abilities
    for (const enemy of Object.values(STATIC_ENEMIES)) {
      if ((enemy as any).bossPhases) {
        for (const phase of (enemy as any).bossPhases) {
          if (phase.newAbilities) {
            for (const ab of phase.newAbilities) {
              const key = abilityKey(ab);
              if (seen.has(key)) continue;

              let slug = slugify(ab.name);
              const existing = seen.get(slug);
              if (existing) {
                existing.count++;
                slug = `${slug}_v${existing.count}`;
              }
              seen.set(key, { slug, count: 1 });

              abilities.push({
                id: slug,
                name: ab.name,
                description: ab.description ?? '',
                power: ab.power,
                chance: ab.chance ?? 50,
                statusType: ab.statusEffect?.type ?? '',
                statusChance: ab.statusEffect?.chance ?? 0,
                statusDuration: ab.statusEffect?.duration ?? 0,
              });
            }
          }
        }
      }
    }

    // Upsert to DB
    let created = 0, updated = 0;
    for (const ab of abilities) {
      const existing = await db.gameEnemyAbility.findUnique({ where: { id: ab.id } });
      const data = {
        name: ab.name,
        description: ab.description,
        power: ab.power,
        chance: ab.chance,
        statusType: ab.statusType,
        statusChance: ab.statusChance,
        statusDuration: ab.statusDuration,
      };
      if (existing) {
        await db.gameEnemyAbility.update({ where: { id: ab.id }, data });
        updated++;
      } else {
        await db.gameEnemyAbility.create({ data: { id: ab.id, ...data } });
        created++;
      }
    }

    // Also re-seed enemies with ability ID arrays instead of full objects
    let enemiesUpdated = 0;
    for (const enemy of Object.values(STATIC_ENEMIES)) {
      const abilityIds: string[] = [];
      for (const ab of enemy.abilities) {
        const key = abilityKey(ab);
        const info = seen.get(key);
        if (info) abilityIds.push(info.slug);
      }
      await db.gameEnemy.update({
        where: { id: enemy.id },
        data: { abilities: JSON.stringify(abilityIds) },
      });
      enemiesUpdated++;
    }

    const result: SeedResult = { entity: 'enemy-abilities', total: abilities.length, created, updated };

    return NextResponse.json({
      success: true,
      message: `Seed completato: ${abilities.length} abilità (${created} nuove, ${updated} agg.), ${enemiesUpdated} nemici aggiornati con ID referenze`,
      result,
      abilitiesCount: abilities.length,
      enemiesUpdated,
    });
  } catch (error) {
    console.error('[seed-enemy-abilities] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
