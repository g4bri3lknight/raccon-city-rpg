import { EndingDefinition } from '../types';

export const ENDINGS: Record<string, EndingDefinition> = {
  // ==========================================
  // ESCAPE — Default ending
  // ==========================================
  ending_escape: {
    id: 'escape',
    title: 'Fuga Normale',
    subtitle: 'Sopravvissuto... ma a quale prezzo?',
    description: 'L\'elicottero vi solleva sopra le fiamme di Raccoon City. Guardate in basso e vedete l\'inferno che state lasciando. Non avete scoperto la verità, non avete salvato tutti quelli che potevate. Siete sopravvissuti, e per ora è tutto ciò che conta. Ma le domande rimangono: chi è responsabile? E succederà di nuovo? Il rumore delle eliche copre le vostre riflessioni mentre volate verso l\'orizzonte.',
    icon: '🏃',
    color: '#22c55e',
    priority: 1,
    requirements: [
      {
        type: 'boss_defeated',
        value: 'tyrant_boss',
      },
    ],
  },

  // ==========================================
  // HERO — Save 3+ NPCs ending
  // ==========================================
  ending_hero: {
    id: 'hero',
    title: 'Eroe di Raccoon City',
    subtitle: 'Non hai solo sopravvissuto — hai salvato vite umane.',
    description: 'L\'elicottero si allontana portando con sé non solo voi, ma i sopravvissuti che avete protetto durante l\'orrore. Marco, il dottor Chen, Hannah — tutti vivi grazie al vostro coraggio. Raccoon City brucia sotto di voi, ma tra le fiamme c\'è ancora speranza. Siete diventati l\'eroe che questa notte disperata necessitava. I sopravvissuti vi guardano con gratitudine mentre il sole sorge all\'orizzonte. Qualcosa è cambiato — in loro e in voi.',
    icon: '🦸',
    color: '#eab308',
    priority: 3,
    requirements: [
      {
        type: 'boss_defeated',
        value: 'tyrant_boss',
      },
      {
        type: 'npc_saved',
        value: 3,
      },
      {
        type: 'party_alive',
        value: 3,
      },
    ],
  },

  // ==========================================
  // TRUTH — Best ending (8+ documents, 2+ secrets)
  // ==========================================
  ending_truth: {
    id: 'truth',
    title: 'La Verità Rivelata',
    subtitle: 'Hai scoperto cosa si nasconde dietro il terrore.',
    description: 'L\'elicottero vola verso la libertà, ma questa volta non con mani vuote. Stringete i documenti segreti dell\'Umbrella — le prove del virus T, del Progetto Tyrant, del complotto che ha distrutto Raccoon City. Avete scoperto le stanze segrete, letto i diari dei ricercatori, e ora conoscete tutta la verità. Non sarete più una vittima — sarete un testimone. La Umbrella pagherà per quello che ha fatto. La verità uscirà alla luce, e il mondo intero saprà. Il sole dell\'alba illumina i documenti tra le vostre mani.',
    icon: '🔍',
    color: '#8b5cf6',
    priority: 4,
    requirements: [
      {
        type: 'boss_defeated',
        value: 'tyrant_boss',
      },
      {
        type: 'documents_found',
        value: 8,
      },
      {
        type: 'secret_rooms',
        value: 2,
      },
    ],
  },

  // ==========================================
  // DARK — Speedrun ending (30 turns or fewer)
  // ==========================================
  ending_dark: {
    id: 'dark',
    title: 'Sopravvissuto nel Sangue',
    subtitle: 'Hai attraversato l\'inferno a passi forsennati.',
    description: 'Siete fuggiti da Raccoon City in tempo record, ma il prezzo pagato è immenso. Non avete avuto il tempo di esplorare, di salvare, di capire. Avete corso attraverso le strade insanguinate, combattuto senza sosta, e lasciato alle vostre spalle tutto ciò che non potevate portare con voi. Nelle fiamme della città restano i corpi di chi non ce l\'ha fatta — e il peso di quella consapevolezza vi accompagnerà per sempre. Siete sopravvissuti. Ma la vittoria sa di cenere.',
    icon: '💀',
    color: '#ef4444',
    priority: 2,
    requirements: [
      {
        type: 'boss_defeated',
        value: 'tyrant_boss',
      },
      {
        type: 'turn_limit',
        value: 30,
      },
    ],
  },
};
