import { NextRequest, NextResponse } from 'next/server';
import { getZaiClient } from '@/lib/ai';

interface NpcChatRequest {
  npcId: string;
  npcName: string;
  npcPortrait: string;
  npcGreeting: string;
  npcDialogues: string[];
  npcPersonality?: string; // AI-1.8: personality field from NPC data
  npcQuest?: {
    id: string;
    name: string;
    description: string;
    type: string;
    targetId: string;
    targetCount: number;
    completed: boolean;
    currentCount: number;
  };
  locationName: string;
  locationDescription: string;
  turnCount: number;
  difficulty: string;
  partyHealth: string;
  partyInventory: string;
  playerMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  stream?: boolean; // AI-1.7: enable streaming response
}

function buildSystemPrompt(req: NpcChatRequest): string {
  // AI-1.8: Use personality from NPC data, with generic fallback
  const personality = req.npcPersonality
    || `Sei ${req.npcName}, un sopravvissuto dell'epidemia di Raccoon City. Rispondi sempre nel character e in italiano.`;

  return `Sei un personaggio del gioco di ruolo survival horror "Raccoon City RPG" ambientato durante l'epidemia di Raccoon City nel settembre 1998.

IDENTITÀ:
${personality}

CONTESTO DI GIOCO:
- Posizione: ${req.locationName} — ${req.locationDescription}
- Turno: ${req.turnCount}
- Difficoltà: ${req.difficulty}
- Stato gruppo: ${req.partyHealth}
- Inventario rilevante: ${req.partyInventory}

REGOLE:
1. Rispondi SEMPRE in italiano, in character come ${req.npcName}
2. Le risposte devono essere brevi (2-4 frasi massimo) — è un dialogo di gioco, non un saggio
3. Adatta il tono alla situazione: se il gruppo è ferito, mostrati preoccupato; se stanno bene, sii più cordiale
4. Puoi menzionare luoghi, nemici, oggetti, e suggerire azioni — ma non rivelare meccaniche di gioco
5. Se il giocatore ti chiede di qualcosa di impossibile, rispondi in character che non puoi aiutare
6. Non rompere la quarta parete — non menzionare che sei un'IA o un gioco
7. Se hai una missione attiva, puoi accennarvi naturalmente nel dialogo
8. Usa un linguaggio da survival horror: teso, atmosferico, ma con momenti di umanità
9. Non inventare eventi o oggetti che non esistono nel gioco
10. Rispondi SOLO con il dialogo del personaggio, senza prefissi come "${req.npcName}:" o virgolette

MISSIONE ATTUALE:
${req.npcQuest ? `${req.npcQuest.name}: ${req.npcQuest.description} [Progresso: ${req.npcQuest.currentCount}/${req.npcQuest.targetCount}, Completata: ${req.npcQuest.completed}]` : 'Nessuna missione attiva.'}`;
}

function pickFallbackDialog(dialogues: string[]): string {
  if (dialogues && dialogues.length > 0) {
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }
  return 'Non posso parlare ora...';
}

export async function POST(request: NextRequest) {
  let body: NpcChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 });
  }

  const { playerMessage, conversationHistory, stream, npcDialogues } = body;

  if (!playerMessage || playerMessage.trim().length === 0) {
    return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(body);
  const zai = await getZaiClient();

  // If AI service is unavailable, return fallback immediately
  if (!zai) {
    return NextResponse.json({
      success: false,
      response: pickFallbackDialog(npcDialogues),
      fallback: true,
    });
  }

  // Build messages array with history
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'assistant', content: systemPrompt },
  ];

  // Add conversation history (last 10 messages to keep context manageable)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
  }

  // Add current player message
  messages.push({ role: 'user', content: playerMessage });

  try {
    // AI-1.7: Streaming response
    if (stream) {
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
        stream: true,
      });

      // The SDK returns a ReadableStream when stream is enabled
      if (completion instanceof ReadableStream) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const streamResponse = new ReadableStream({
          async start(controller) {
            try {
              const reader = completion.getReader();
              let fullText = '';

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                // Send SSE event with the chunk
                const eventData = JSON.stringify({
                  type: 'chunk',
                  content: chunk,
                  fullText,
                });
                controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
              }

              // Send done event
              const doneData = JSON.stringify({
                type: 'done',
                fullText,
              });
              controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
              controller.close();
            } catch (err) {
              console.warn('[NPC Chat] Stream error:', err);
              const errorData = JSON.stringify({
                type: 'error',
                error: err instanceof Error ? err.message : 'Errore nello streaming',
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              controller.close();
            }
          },
        });

        return new Response(streamResponse, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // Fallback if stream wasn't actually a ReadableStream (shouldn't happen but safety)
      console.warn('[NPC Chat] Stream requested but SDK did not return ReadableStream, falling back to non-stream');
    }

    // Non-streaming response (original behavior)
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content;

    if (!response || response.trim().length === 0) {
      return NextResponse.json({
        success: true,
        response: pickFallbackDialog(npcDialogues),
        fallback: true,
      });
    }

    return NextResponse.json({
      success: true,
      response: response.trim(),
      fallback: false,
    });
  } catch (error) {
    // AI call failed — return fallback dialogue gracefully
    console.warn('[NPC Chat] AI response failed, using fallback');
    return NextResponse.json({
      success: false,
      response: pickFallbackDialog(npcDialogues),
      fallback: true,
    });
  }
}
