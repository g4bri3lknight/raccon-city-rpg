import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Default settings — seeded on first GET if table is empty
const DEFAULTS: Record<string, { value: string; label: string; group: string; sortOrder: number }> = {
  // ── Title Screen ──
  'titleScreen.umbrellaText':    { value: 'Umbrella Corporation Presenta', label: 'Testo Umbrella Corp',           group: 'titleScreen.texts',  sortOrder: 0 },
  'titleScreen.title':           { value: 'RACCOON CITY',                  label: 'Titolo Principale',              group: 'titleScreen.texts',  sortOrder: 1 },
  'titleScreen.subtitle':        { value: 'Escape from Horror',            label: 'Sottotitolo',                    group: 'titleScreen.texts',  sortOrder: 2 },
  'titleScreen.description':     { value: 'Il virus T ha trasformato la città in un incubo. Siete gli ultimi sopravvissuti. Trovate una via d\'uscita... prima che sia troppo tardi.', label: 'Descrizione', group: 'titleScreen.texts',  sortOrder: 3 },
  'titleScreen.newGameBtn':      { value: 'Nuova partita',                 label: 'Tasto Nuova Partita',            group: 'titleScreen.buttons', sortOrder: 10 },
  'titleScreen.loadGameBtn':     { value: 'Carica partita',                label: 'Tasto Carica Partita',           group: 'titleScreen.buttons', sortOrder: 11 },
  'titleScreen.warningText':     { value: '⚠ CONTENUTO HORROR — Gioco a turni per 1-3 giocatori', label: 'Testo Avvertenza', group: 'titleScreen.texts', sortOrder: 4 },
  // Visual style
  'titleScreen.umbrellaColor':   { value: '#dc2626',   label: 'Colore Testo Umbrella',    group: 'titleScreen.style',   sortOrder: 20 },
  'titleScreen.titleColor':      { value: '#e5e5e5',   label: 'Colore Titolo',            group: 'titleScreen.style',   sortOrder: 21 },
  'titleScreen.titleGlow':       { value: '0 0 40px rgba(220,38,38,0.6), 0 0 80px rgba(220,38,38,0.3), 0 0 120px rgba(220,38,38,0.1), 3px 3px 0 #000', label: 'Ombra Titolo (text-shadow)', group: 'titleScreen.style', sortOrder: 22 },
  'titleScreen.subtitleColor':   { value: '#f87171',   label: 'Colore Sottotitolo',       group: 'titleScreen.style',   sortOrder: 23 },
  'titleScreen.overlayOpacity':  { value: '0.7',       label: 'Opacità Overlay Sfondo',   group: 'titleScreen.style',   sortOrder: 24 },
  'titleScreen.btnBg':           { value: '#7f1d1d',   label: 'Sfondo Pulsanti (hex)',    group: 'titleScreen.style',   sortOrder: 30 },
  'titleScreen.btnBorder':       { value: '#b91c1c',   label: 'Bordo Pulsanti (hex)',     group: 'titleScreen.style',   sortOrder: 31 },
  'titleScreen.btnHoverBg':      { value: '#991b1b',   label: 'Sfondo Pulsanti Hover (hex)', group: 'titleScreen.style', sortOrder: 32 },
  'titleScreen.btnHoverBorder':  { value: '#ef4444',   label: 'Bordo Pulsanti Hover (hex)', group: 'titleScreen.style', sortOrder: 33 },
  'titleScreen.btnTextColor':    { value: '#fee2e2',   label: 'Testo Pulsanti (hex)',     group: 'titleScreen.style',   sortOrder: 34 },
  'titleScreen.btnGlowHover':    { value: 'rgba(220,38,38,0.4)', label: 'Glow Hover Pulsanti (rgba)', group: 'titleScreen.style', sortOrder: 35 },

  // ── Gameplay ──
  'gameplay.maxInventorySlots':     { value: '12',  label: 'Slot Massimi Inventario',          group: 'gameplay.inventory', sortOrder: 100 },
  'gameplay.maxItemBoxSlots':       { value: '48',  label: 'Slot Massimi Item Box',           group: 'gameplay.itembox',   sortOrder: 110 },
  'gameplay.defaultItemBoxItems':   { value: '[]',  label: 'Oggetti Default Item Box (JSON)', group: 'gameplay.itembox',   sortOrder: 111 },
  'gameplay.startingInventorySlots':{ value: '6',   label: 'Slot Iniziali Inventario',        group: 'gameplay.inventory', sortOrder: 101 },
};

async function ensureDefaults() {
  for (const [key, def] of Object.entries(DEFAULTS)) {
    await db.gameSetting.upsert({
      where: { key },
      update: {}, // only create if missing, never overwrite existing values
      create: { key, value: def.value, label: def.label, group: def.group, sortOrder: def.sortOrder },
    });
  }
}

// GET /api/admin/game-settings — return all settings (auto-seed defaults if empty)
export async function GET() {
  try {
    await ensureDefaults();
    const settings = await db.gameSetting.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/admin/game-settings — bulk update settings
// Body: { settings: { key: value, ... } }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'settings object is required' }, { status: 400 });
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await db.gameSetting.upsert({
        where: { key },
        update: { value },
        create: {
          key,
          value,
          label: DEFAULTS[key]?.label ?? key,
          group: DEFAULTS[key]?.group ?? 'gameplay',
          sortOrder: DEFAULTS[key]?.sortOrder ?? 0,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
