import { StateCreator } from 'zustand';
import { GameStore } from '../types';
import { playMenuOpen, playMenuClose } from '../../engine/sounds';

export const createDocumentsSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  toggleDocuments: () => {
    try {
      const isOpen = get().documentsOpen;
      if (!isOpen) playMenuOpen(); else playMenuClose();
    } catch {}
    set(state => ({ documentsOpen: !state.documentsOpen }));
  },

  markDocumentRead: (docId: string) => {
    const state = get();
    if (state.readDocuments.includes(docId)) return;
    set({ readDocuments: [...state.readDocuments, docId] });
  },
});
