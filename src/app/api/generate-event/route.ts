import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { aiCache, eventCacheKey } from '@/game/engine/ai-cache';
import type { DynamicEvent, DynamicEventType } from '@/game/types';

// -----------------------------------------------
// Request / Response types
// -----------------------------------------------

interface GenerateEventRequest {
  locationId: string;
  locationName: string;
  locationDescription: string;
  turnCount: number;
  difficulty: string;
  partyHealth: string;
  existingEventIds: string[];
  storyChoices: string[];
}

interface GenerateEventResponse {
  events: DynamicEvent[];
  fallback: boolean;
}

// -----------------------------------------------
// Valid IDs
// -----------------------------------------------

const VALID_ITEM_IDS = new Set([
  'herb_green', 'herb_red', 'herb_mixed', 'bandage', 'first_aid',
  'antidote', 'spray', 'ammo_pistol', 'ammo_shotgun', 'ammo_magnum',
  'ammo_grenade', 'ammo_machinegun', 'flashlight', 'lockpick',
]);

const VALID_LOCATION_IDS = new Set([
  'city_outskirts', 'rpd_station', 'hospital_district',
  'sewers', 'laboratory_entrance', 'clock_tower',
]);

const VALID_EVENT_TYPES = new Set<DynamicEventType>([
  'blackout', 'alarm', 'collapse', 'lockdown', 'gas_leak', 'fire',
]);

// -----------------------------------------------
// ZAI singleton
// -----------------------------------------------

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZai() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// -----------------------------------------------
// System prompt
// -----------------------------------------------

function buildSystemPrompt(req: GenerateEventRequest): string {
  const excludedIds = req.existingEventIds.length > 0
    ? `- NON usare questi ID (già generati): ${req.existingEventIds.join(', ')}`
    : '';

  return `Sei un generatore di eventi dinamici per il gioco di ruolo survival horror "Raccoon City RPG" ambientato durante l'epidemia di Raccoon City, settembre 1998.

CONTESTO ATTUALE:
- Luogo: ${req.locationName} — ${req.locationDescription}
- ID luogo: ${req.locationId}
- Turno: ${req.turnCount}
- Difficoltà: ${req.difficulty}
- Stato salute gruppo: ${req.partyHealth}
- Scelte narrativa fatte: ${req.storyChoices.length > 0 ? req.storyChoices.join(', ') : 'Nessuna'}

REGOLE DI GENERAZIONE:
1. Genera 1-2 eventi dinamici unici e contestuali per questa location
2. Ogni evento DEVE essere adatto all'atmosfera del luogo:
   - city_outskirts → blackout, crolli, allarmi di auto
   - rpd_station → lockdown, blackout, allarmi
   - hospital_district → gas_leak, blackout, allarmi biohazard
   - sewers → gas_leak, collapse, blackout
   - laboratory_entrance → lockdown, gas_leak, blackout, allarmi
   - clock_tower → collapse, blackout, allarmi
3. Tutti i testi (titolo, descrizione, messaggi, scelte) DEVONO essere in italiano
4. La descrizione deve essere atmosferica e horror (2-4 frasi)
5. Durata: 1-3 turni (duration)
6. minTurn: basato sul turno attuale (può essere turno attuale o +1/+2)
7. Ogni evento DEVE avere 2-3 scelte (choices), ognuna con testo italiano e un outcome
8. Almeno una scelta dovrebbe avere endEvent: true
9. Usa SOLO questi itemId validi per receiveItems: ${[...VALID_ITEM_IDS].join(', ')}
10. Usa SOLO questi event type: ${[...VALID_EVENT_TYPES].join(', ')}
11. triggerChance: 15-40 (percentuale per esplorazione)
12. effect.encounterRateMod: -10 a +20
13. effect.enemyStatMult: 0.8 a 1.5
14. effect.searchBonus: true/false
15. effect.damagePerTurn: 0-15
16. hpChange nelle scelte: da -30 a +30
17. Gli ID degli eventi devono essere univoci, in formato snake_case (es: "sewer_gas_cloud")
18. locationIds: array vuoto [] significa "qualsiasi luogo", oppure specifica il locationId attuale
${excludedIds}

IMPORTANTE: Rispondi SOLO con un array JSON valido, senza markdown, senza backtick, senza spiegazioni.
Formato atteso:
[
  {
    "id": "string_unique_id",
    "title": "Titolo in italiano",
    "description": "Descrizione atmosferica in italiano...",
    "icon": "emoji_rappresentativo",
    "type": "uno_di: blackout|alarm|collapse|lockdown|gas_leak|fire",
    "duration": 1-3,
    "effect": {
      "encounterRateMod": number,
      "enemyStatMult": number,
      "searchBonus": boolean,
      "damagePerTurn": number
    },
    "triggerChance": 15-40,
    "minTurn": number,
    "locationIds": [],
    "onTriggerMessage": "Messaggio quando l'evento si attiva...",
    "onEndMessage": "Messaggio quando l'evento finisce...",
    "choices": [
      {
        "text": "Scelta in italiano",
        "outcome": {
          "description": "Esito in italiano",
          "endEvent": true/false,
          "receiveItems": [{ "itemId": "id_valido", "quantity": 1 }],
          "hpChange": 0
        }
      }
    ]
  }
]

Adatta la difficoltà:
- sopravvissuto: eventi più gentili, più ricompense, meno danno
- normale: bilanciato
- incubo: eventi più pericolosi, meno ricompense, più danno

Se il gruppo è in cattive condizioni di salute, riduci i danni e aumenta le possibilità di guarigione nelle scelte.`;
}

// -----------------------------------------------
// Validation
// -----------------------------------------------

function isValidDynamicEvent(obj: unknown): obj is DynamicEvent {
  if (!obj || typeof obj !== 'object') return false;
  const e = obj as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ['id', 'title', 'description', 'icon', 'onTriggerMessage', 'onEndMessage'];
  for (const key of requiredStrings) {
    if (typeof e[key] !== 'string' || (e[key] as string).trim().length === 0) return false;
  }

  // Valid type
  if (!VALID_EVENT_TYPES.has(e.type as DynamicEventType)) return false;

  // Valid duration
  if (typeof e.duration !== 'number' || e.duration < 1 || e.duration > 3) return false;

  // Valid effect object
  const effect = e.effect;
  if (!effect || typeof effect !== 'object') return false;
  const fx = effect as Record<string, unknown>;
  if (typeof fx.encounterRateMod !== 'number') return false;
  if (typeof fx.enemyStatMult !== 'number') return false;
  if (typeof fx.searchBonus !== 'boolean') return false;
  if (typeof fx.damagePerTurn !== 'number') return false;

  // Valid triggerChance
  if (typeof e.triggerChance !== 'number' || e.triggerChance < 5 || e.triggerChance > 60) return false;

  // Valid minTurn
  if (typeof e.minTurn !== 'number') return false;

  // Valid locationIds
  if (!Array.isArray(e.locationIds)) return false;

  // Valid choices
  if (!Array.isArray(e.choices) || e.choices.length < 2) return false;
  for (const choice of e.choices) {
    if (!choice || typeof choice !== 'object') return false;
    const c = choice as Record<string, unknown>;
    if (typeof c.text !== 'string' || (c.text as string).trim().length === 0) return false;
    if (!c.outcome || typeof c.outcome !== 'object') return false;
    const o = c.outcome as Record<string, unknown>;
    if (typeof o.description !== 'string') return false;
    if (typeof o.endEvent !== 'boolean') return false;

    // Validate receiveItems if present
    if (o.receiveItems !== undefined) {
      if (!Array.isArray(o.receiveItems)) return false;
      for (const item of o.receiveItems) {
        if (!item || typeof item !== 'object') return false;
        const ri = item as Record<string, unknown>;
        if (!VALID_ITEM_IDS.has(ri.itemId as string)) return false;
        if (typeof ri.quantity !== 'number' || (ri.quantity as number) < 1) return false;
      }
    }

    // Validate hpChange if present
    if (o.hpChange !== undefined && typeof o.hpChange !== 'number') return false;
  }

  return true;
}

function sanitizeEvent(event: DynamicEvent): DynamicEvent {
  return {
    id: event.id.trim(),
    title: event.title.trim(),
    description: event.description.trim(),
    icon: event.icon.trim(),
    type: event.type,
    duration: Math.max(1, Math.min(3, Math.round(event.duration))),
    effect: {
      encounterRateMod: event.effect.encounterRateMod,
      enemyStatMult: event.effect.enemyStatMult,
      searchBonus: event.effect.searchBonus,
      damagePerTurn: Math.max(0, event.effect.damagePerTurn),
    },
    triggerChance: Math.max(5, Math.min(60, Math.round(event.triggerChance))),
    minTurn: Math.max(0, Math.round(event.minTurn)),
    locationIds: event.locationIds.filter((lid) => VALID_LOCATION_IDS.has(lid)),
    onTriggerMessage: event.onTriggerMessage.trim(),
    onEndMessage: event.onEndMessage.trim(),
    choices: event.choices.map((c) => ({
      text: c.text.trim(),
      outcome: {
        description: c.outcome.description.trim(),
        endEvent: c.outcome.endEvent,
        receiveItems: c.outcome.receiveItems?.filter(
          (item) => VALID_ITEM_IDS.has(item.itemId) && item.quantity >= 1,
        ),
        hpChange: c.outcome.hpChange,
      },
    })),
  };
}

// -----------------------------------------------
// POST handler
// -----------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: GenerateEventRequest = await request.json();

    if (!body.locationId || !body.locationName) {
      return NextResponse.json<GenerateEventResponse>({ events: [], fallback: true });
    }

    // Check cache first
    const cacheKey = eventCacheKey(body.locationId);
    const cached = aiCache.get<DynamicEvent[]>(cacheKey);
    if (cached && cached.length > 0) {
      // Filter out already-used events from cache
      const filtered = cached.filter((e) => !body.existingEventIds.includes(e.id));
      if (filtered.length > 0) {
        return NextResponse.json<GenerateEventResponse>({
          events: filtered.slice(0, 2),
          fallback: false,
        });
      }
    }

    // Rate limiting check
    if (!aiCache.canCall('event')) {
      return NextResponse.json<GenerateEventResponse>({ events: [], fallback: true });
    }

    const systemPrompt = buildSystemPrompt(body);
    const zai = await getZai();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        {
          role: 'user',
          content: 'Genera 1-2 eventi dinamici per il contesto sopra. Rispondi solo con il JSON array.',
        },
      ],
      thinking: { type: 'disabled' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw || raw.trim().length === 0) {
      return NextResponse.json<GenerateEventResponse>({ events: [], fallback: true });
    }

    // Parse JSON — strip markdown fences if present
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to extract array from surrounding text
      const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          parsed = JSON.parse(arrayMatch[0]);
        } catch {
          return NextResponse.json<GenerateEventResponse>({ events: [], fallback: true });
        }
      } else {
        return NextResponse.json<GenerateEventResponse>({ events: [], fallback: true });
      }
    }

    // Validate events
    const events: DynamicEvent[] = [];
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (isValidDynamicEvent(item)) {
          const sanitized = sanitizeEvent(item);
          // Skip if this ID was already used
          if (!body.existingEventIds.includes(sanitized.id)) {
            events.push(sanitized);
          }
          if (events.length >= 2) break;
        }
      }
    }

    // Cache the generated events
    if (events.length > 0) {
      aiCache.set(cacheKey, events);
      aiCache.recordCall('event');
    }

    return NextResponse.json<GenerateEventResponse>({
      events,
      fallback: events.length === 0,
    });
  } catch (error) {
    console.error('Generate Event API error:', error);
    return NextResponse.json<GenerateEventResponse>({ events: [], fallback: true });
  }
}
