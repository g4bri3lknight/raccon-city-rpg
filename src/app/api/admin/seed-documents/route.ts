import { db } from '@/lib/db';
import { STATIC_DOCUMENTS } from '@/game/data/documents';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/seed-documents
 * Seeds all documents from static data into the documents table.
 * Uses upsert for idempotency.
 */
export async function POST() {
  try {
    const entries = Object.values(STATIC_DOCUMENTS);
    let created = 0;
    let updated = 0;

    for (const doc of entries) {
      const existing = await db.document.findUnique({ where: { id: doc.id } });
      const data = {
        title: doc.title,
        content: doc.content,
        type: doc.type,
        locationId: doc.locationId,
        icon: doc.icon || '',
        rarity: doc.rarity,
        isSecret: doc.isSecret ?? false,
        hintRequired: (doc as any).hintRequired ?? null,
      };

      if (existing) {
        await db.document.update({ where: { id: doc.id }, data });
        updated++;
      } else {
        await db.document.create({ data: { id: doc.id, ...data } });
        created++;
      }
    }

    return NextResponse.json({ success: true, total: entries.length, created, updated });
  } catch (error) {
    console.error('[seed-documents] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
