import { NextRequest, NextResponse } from 'next/server';
import { getZaiClient } from '@/lib/ai';
import { aiCache, documentCacheKey } from '@/game/engine/ai-cache';
import type { GameDocument, DocumentType } from '@/game/types';

// ==========================================
// AI-Generated Procedural Documents / Lore
// Raccoon City RPG — Survival Horror
// ==========================================

// --- Icon mapping ---
const ICON_BY_TYPE: Record<DocumentType, string> = {
  diary: '📔',
  umbrella_file: '📁',
  note: '📝',
  photo: '📷',
  report: '📋',
};

// --- Valid locations ---
const VALID_LOCATIONS = [
  'city_outskirts',
  'rpd_station',
  'hospital_district',
  'sewers',
  'laboratory_entrance',
  'clock_tower',
] as const;

// --- ZAI is managed by shared utility @/lib/ai ---

// --- Request body interface ---
interface GenerateDocumentRequest {
  locationId: string;
  locationName: string;
  locationDescription: string;
  turnCount: number;
  difficulty: string;
  existingDocumentIds: string[];
  storyChoices: string[];
}

// --- LLM raw document shape ---
interface RawDocument {
  id?: string;
  title?: string;
  content?: string;
  type?: string;
  icon?: string;
  rarity?: string;
  isSecret?: boolean;
  hintRequired?: string;
}

// --- Response interface ---
interface GenerateDocumentResponse {
  documents: GameDocument[];
  fallback: boolean;
}

// --- Validation helper ---
function isValidDocumentType(t: string): t is DocumentType {
  return ['diary', 'umbrella_file', 'note', 'photo', 'report'].includes(t);
}

function isValidRarity(r: string): r is GameDocument['rarity'] {
  return ['common', 'uncommon', 'rare', 'legendary'].includes(r);
}

function validateAndNormalize(raw: RawDocument, locationId: string): GameDocument | null {
  // Require at minimum id, title, content, type
  if (!raw.id || !raw.title || !raw.content || !raw.type) return null;
  if (raw.content.trim().length < 10) return null;
  if (!isValidDocumentType(raw.type)) return null;

  const rarity = isValidRarity(raw.rarity || '') ? raw.rarity : 'common';

  return {
    id: raw.id,
    title: raw.title,
    content: raw.content.trim(),
    type: raw.type,
    locationId,
    icon: ICON_BY_TYPE[raw.type],
    rarity,
    isSecret: false,
    ...(raw.hintRequired ? { hintRequired: raw.hintRequired } : {}),
  };
}

// --- System prompt builder ---
function buildSystemPrompt(req: GenerateDocumentRequest): string {
  const existingList = req.existingDocumentIds.length > 0
    ? req.existingDocumentIds.join(', ')
    : 'nessun documento esistente';

  const choices = req.storyChoices.length > 0
    ? req.storyChoices.join(', ')
    : 'nessuna scelta ancora';

  return `Sei il narratore e lore-master di "Raccoon City RPG", un gioco di ruolo survival horror ambientato durante l'epidemia di Raccoon City nel settembre 1998. Il tuo compito è generare documenti di gioco immersivi e atmosferici che il giocatore può trovare esplorando.

CONTESTO ATTUALE:
- Luogo: ${req.locationName} — ${req.locationDescription}
- ID luogo: ${req.locationId}
- Turno: ${req.turnCount}
- Difficoltà: ${req.difficulty}
- Scelte narrativa del giocatore: ${choices}
- Documenti già generati/trovati per questo luogo: ${existingList}

TIPI DI DOCUMENTO DISPONIBILI:
1. "diary" (📔) — Diari personali, voci di giornale, emozionali, in prima persona
2. "umbrella_file" (📁) — Documenti corporate Umbrella, clinici, classificati, freddi e burocratici
3. "note" (📝) — Messaggi rapidi, appunti disperati, scritti a mano, concisi
4. "photo" (📷) — Fotografie trovate con descrizione sul retro
5. "report" (📋) — Rapporti ufficiali, fattuali, burocratici, formali

FLAVOUR SPECIFICO PER LUOGO:
- city_outskirts: prospettiva civile, caos, tentativi di fuga, vittime innocenti, messaggi disperati
- rpd_station: registri di polizia, prove, corruzione del capo Irons, barricate, piani di evacuazione
- hospital_district: cartelle mediche, ricerca sul virus, paziente zero, esperimenti segreti, cronache del contagio
- sewers: appunti di operai, registri di smaltimento Umbrella, avvistamenti di creature, manutenzione
- laboratory_entrance: log di ricerca, progetti Tyrant, programma Nemesis, dati sperimentali, protocolli di sicurezza
- clock_tower: ore finali, evacuazione, protocollo missilistico, ultimi momenti, deliberazione

ISTRUZIONI DI GENERAZIONE:
1. Genera 1-2 documenti unici per questo luogo. NON usare ID già presenti in "existingDocumentIds".
2. Ogni documento deve avere un contenuto in italiano, 3-6 frasi, atmosferico e immersivo.
3. Il contenuto deve contenere lore, indizi sulla storia, suggerimenti su nemici/oggetti, o momenti emozionali.
4. Varia i tipi di documento: non generare tutti dello stesso tipo.
5. "isSecret" DEVE essere sempre false.
6. Formato ID: "ai_doc_{locationId}_{random}" dove random è una stringa alfanumerica casuale (es. "ai_doc_hospital_district_7x3k").
7. Assegna una rarità appropriata: "common" per note veloci, "uncommon" per diari, "rare" per file Umbrella, "legendary" per documenti cruciali.
8. Adatta il contenuto al turno di gioco: turni avanzati = informazioni più urgenti e drammatiche.
9. Se il giocatore ha fatto scelte narrative specifiche, riflettile nei documenti quando possibile.

FORMATO RISPOSTA:
Restituisci SOLO un array JSON valido di documenti, senza testo aggiuntivo, senza markdown, senza backticks.
Ogni documento deve avere questo formato:
{
  "id": "ai_doc_{locationId}_{random}",
  "title": "Titolo del documento",
  "content": "Contenuto in italiano, 3-6 frasi...",
  "type": "diary|umbrella_file|note|photo|report",
  "rarity": "common|uncommon|rare|legendary"
}

NON includere "isSecret", "locationId" o "icon" nella risposta — verranno aggiunti dal sistema.
NON includere "hintRequired" — i documenti generati non sono segreti.
Rispondi SOLO con l'array JSON, nient'altro.`;
}

// --- POST handler ---
export async function POST(request: NextRequest) {
  try {
    const body: GenerateDocumentRequest = await request.json();

    // Basic validation
    if (!body.locationId || !VALID_LOCATIONS.includes(body.locationId as typeof VALID_LOCATIONS[number])) {
      return NextResponse.json({ documents: [], fallback: true } satisfies GenerateDocumentResponse);
    }

    if (!body.locationName || !body.locationDescription) {
      return NextResponse.json({ documents: [], fallback: true } satisfies GenerateDocumentResponse);
    }

    // Check cache first
    const cacheKey = documentCacheKey(body.locationId);
    const cached = aiCache.get<GameDocument[]>(cacheKey);
    if (cached) {
      // Filter out documents already collected
      const fresh = cached.filter(
        (doc) => !body.existingDocumentIds.includes(doc.id)
      );
      if (fresh.length > 0) {
        return NextResponse.json({
          documents: fresh.slice(0, 2),
          fallback: false,
        } satisfies GenerateDocumentResponse);
      }
    }

    // Rate limiting check
    if (!aiCache.canCall('document')) {
      return NextResponse.json({ documents: [], fallback: true } satisfies GenerateDocumentResponse);
    }

    const zai = await getZaiClient();

    if (!zai) {
      return NextResponse.json({ documents: [], fallback: true } satisfies GenerateDocumentResponse);
    }

    const systemPrompt = buildSystemPrompt(body);

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        {
          role: 'user',
          content: `Genera 1-2 documenti per "${body.locationName}" (${body.locationId}). Documenti già presenti: ${body.existingDocumentIds.length > 0 ? body.existingDocumentIds.join(', ') : 'nessuno'}.`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const rawText = completion.choices[0]?.message?.content;
    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ documents: [], fallback: true } satisfies GenerateDocumentResponse);
    }

    // Parse JSON from response — handle potential markdown wrapping
    let cleanText = rawText.trim();
    // Strip markdown code fences if present
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      console.error('[generate-document] Failed to parse LLM JSON response:', cleanText.slice(0, 200));
      return NextResponse.json({ documents: [], fallback: true } satisfies GenerateDocumentResponse);
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ documents: [], fallback: true } satisfies GenerateDocumentResponse);
    }

    // Validate and normalize each document
    const documents: GameDocument[] = [];
    const seenIds = new Set<string>();

    for (const raw of parsed) {
      const doc = validateAndNormalize(raw as RawDocument, body.locationId);
      if (!doc) continue;

      // Skip duplicates and already-existing documents
      if (seenIds.has(doc.id)) continue;
      if (body.existingDocumentIds.includes(doc.id)) continue;

      // Ensure proper ID prefix
      if (!doc.id.startsWith('ai_doc_')) continue;

      seenIds.add(doc.id);
      documents.push(doc);
    }

    // Store in cache for future requests
    if (documents.length > 0) {
      aiCache.set(cacheKey, documents);
      aiCache.recordCall('document');
    }

    return NextResponse.json({
      documents: documents.slice(0, 2),
      fallback: false,
    } satisfies GenerateDocumentResponse);
  } catch (error) {
    console.warn('[generate-document] AI error, using fallback');
    return NextResponse.json({ documents: [], fallback: true } satisfies GenerateDocumentResponse);
  }
}
