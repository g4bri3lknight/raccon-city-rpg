import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: list all notification configs ordered by sortOrder
export async function GET() {
  try {
    const configs = await db.notificationConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(configs);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST: create new config
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = await db.notificationConfig.create({
      data: {
        id: body.id,
        type: body.type ?? body.id,
        label: body.label ?? '',
        icon: body.icon ?? '',
        imageRef: body.imageRef ?? null,
        soundRef: body.soundRef ?? null,
        cardBg: body.cardBg ?? '#1a1a2e',
        borderColor: body.borderColor ?? '#333333',
        titleColor: body.titleColor ?? '#ffffff',
        titleGlow: body.titleGlow ?? 'none',
        overlayBg: body.overlayBg ?? 'rgba(0,0,0,0.8)',
        scanlineColor: body.scanlineColor ?? 'rgba(255,255,255,0.3)',
        shake: body.shake ?? false,
        duration: body.duration ?? 2500,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    return NextResponse.json(config);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Unique')) {
      return NextResponse.json({ error: 'ID o type già esistente' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT: update config by id
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID richiesto' }, { status: 400 });
    }
    const config = await db.notificationConfig.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.imageRef !== undefined && { imageRef: data.imageRef || null }),
        ...(data.soundRef !== undefined && { soundRef: data.soundRef || null }),
        ...(data.cardBg !== undefined && { cardBg: data.cardBg }),
        ...(data.borderColor !== undefined && { borderColor: data.borderColor }),
        ...(data.titleColor !== undefined && { titleColor: data.titleColor }),
        ...(data.titleGlow !== undefined && { titleGlow: data.titleGlow }),
        ...(data.overlayBg !== undefined && { overlayBg: data.overlayBg }),
        ...(data.scanlineColor !== undefined && { scanlineColor: data.scanlineColor }),
        ...(data.shake !== undefined && { shake: data.shake }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
    return NextResponse.json(config);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('RecordNotFound') || msg.includes('not found')) {
      return NextResponse.json({ error: 'Config non trovato' }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: delete config by id query param
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID richiesto' }, { status: 400 });
    }
    await db.notificationConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('RecordNotFound') || msg.includes('not found')) {
      return NextResponse.json({ error: 'Config non trovato' }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
