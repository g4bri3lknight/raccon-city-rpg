'use client';

import { useCallback, useRef } from 'react';
import { useGameStore } from '@/game/store';
import { LOCATIONS, ITEMS } from '@/game/data/loader';

/**
 * AI-2.3/AI-2.4 — Hook that triggers AI content generation for locations.
 * Called from ExplorationScreen when a player first visits a location.
 * Generates events and documents via LLM, stores them in Zustand.
 */
export function useAIContentGenerator() {
  const {
    currentLocationId,
    turnCount,
    difficulty,
    party,
    collectedDocuments,
    storyChoices,
    aiContentGenerated,
    aiGeneratedEvents,
    aiGeneratedDocuments,
    setAiGeneratedEvents,
    setAiGeneratedDocuments,
  } = useGameStore();

  const generatingRef = useRef<string | null>(null);

  const generateContentForLocation = useCallback(async (locationId?: string) => {
    const locId = locationId || currentLocationId;
    if (!locId) return;

    // Don't generate for boss area
    if (locId === 'clock_tower') return;

    // Don't regenerate if already done
    if (aiContentGenerated.includes(locId)) return;

    // Prevent duplicate concurrent calls
    if (generatingRef.current === locId) return;
    generatingRef.current = locId;

    const location = LOCATIONS[locId];
    if (!location) {
      generatingRef.current = null;
      return;
    }

    const partyHealth = party
      .filter(p => p.currentHp > 0)
      .map(p => `${p.name}: ${p.currentHp}/${p.maxHp} HP`)
      .join(', ') || 'Tutti svenuti';

    const existingEventIds = (aiGeneratedEvents[locId] || []).map(e => e.id);
    const existingDocIds = [
      ...collectedDocuments,
      ...(aiGeneratedDocuments[locId] || []).map(d => d.id),
    ];

    try {
      // Generate events and documents in parallel
      const [eventRes, docRes] = await Promise.allSettled([
        fetch('/api/generate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId: locId,
            locationName: location.name,
            locationDescription: location.description,
            turnCount,
            difficulty,
            partyHealth,
            existingEventIds,
            storyChoices,
          }),
        }),
        fetch('/api/generate-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId: locId,
            locationName: location.name,
            locationDescription: location.description,
            turnCount,
            difficulty,
            existingDocumentIds: existingDocIds,
            storyChoices,
          }),
        }),
      ]);

      // Process events
      if (eventRes.status === 'fulfilled' && eventRes.value.ok) {
        const eventData = await eventRes.value.json();
        if (eventData.events && eventData.events.length > 0) {
          setAiGeneratedEvents(locId, eventData.events);
        }
      }

      // Process documents
      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        const docData = await docRes.value.json();
        if (docData.documents && docData.documents.length > 0) {
          setAiGeneratedDocuments(locId, docData.documents);
        }
      }
    } catch (err) {
      console.warn('AI content generation failed (non-critical):', err);
    } finally {
      generatingRef.current = null;
    }
  }, [
    currentLocationId,
    turnCount,
    difficulty,
    party,
    collectedDocuments,
    storyChoices,
    aiContentGenerated,
    aiGeneratedEvents,
    aiGeneratedDocuments,
    setAiGeneratedEvents,
    setAiGeneratedDocuments,
  ]);

  return { generateContentForLocation };
}
