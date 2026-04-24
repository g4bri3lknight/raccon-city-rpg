import { StateCreator } from 'zustand';
import { GameStore } from '../types';

export const createDocumentsSlice: StateCreator<GameStore, [], [], GameStore> = (set, get) => ({
  toggleDocuments: () => {
    set(state => ({ documentsOpen: !state.documentsOpen }));
  },

  markDocumentRead: (docId: string) => {
    const state = get();
    if (state.readDocuments.includes(docId)) return;
    set({ readDocuments: [...state.readDocuments, docId] });
  },
});
