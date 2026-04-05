import { SecretRoom } from '../types';

export const SECRET_ROOMS: Record<string, SecretRoom> = {
  // ==========================================
  // RPD EVIDENCE ROOM
  // ==========================================
  secret_rpd_evidence_room: {
    id: 'secret_rpd_evidence_room',
    locationId: 'rpd_station',
    name: 'Stanza Prove Nascosta',
    description: 'Dietro una parete finta nell\'armeria si nasconde una piccola stanza blindata. Scaffali pieni di prove sequestrate, cassette di sicurezza, e vecchi dossier della polizia. È come un museo dei crimini di Raccoon City — e tra questi, prove schiaccianti contro la Umbrella Corporation.',
    discoveryMethod: 'search',
    searchChance: 15,
    hint: 'Nelle pareti dell\'armeria c\'è qualcosa di strano... una rientranza che non corrisponde alla pianta del distretto.',
    lootTable: [
      { itemId: 'ammo_pistol', chance: 100, quantity: 8 },
      { itemId: 'ammo_shotgun', chance: 100, quantity: 4 },
    ],
    uniqueItem: { itemId: 'lockpick', quantity: 1 },
  },

  // ==========================================
  // HOSPITAL BASEMENT
  // ==========================================
  secret_hospital_basement: {
    id: 'secret_hospital_basement',
    locationId: 'hospital_district',
    name: 'Cantina Segreta dell\'Ospedale',
    description: 'Un\'antica porta di metallo nascosta dietro un armadietto medico nel reparto pediatria. Una scala ripida scende nella cantina segreta — un piccolo magazzino di provette e farmaci sperimentali della Umbrella. L\'aria è gelida e le pareti sono coperte di muffa verde. Qualcosa è stato conservato qui per molto tempo.',
    discoveryMethod: 'document',
    requiredDocumentId: 'doc_patient_record',
    searchChance: 0,
    hint: 'Il documento parla di un "Reposito B3" sotto l\'ospedale... potrebbe esserci un passaggio nascosto nel reparto pediatrico.',
    lootTable: [
      { itemId: 'herb_red', chance: 100, quantity: 2 },
      { itemId: 'spray', chance: 100, quantity: 1 },
    ],
    uniqueItem: { itemId: 'magnum', quantity: 1 },
  },

  // ==========================================
  // SEWERS CACHE
  // ==========================================
  secret_sewers_cache: {
    id: 'secret_sewers_cache',
    locationId: 'sewers',
    name: 'Nascondiglio nei Condotti',
    description: 'Una grata arrugginita nasconde una grotta artificiale scavata dai lavoratori della Umbrella per nascondere rifornimenti di emergenza. Scatole militari impilate contro le pareti, munizioni per ogni tipo di arma, e qualcosa di più grande — un lanciarazzi con un solo colpo, probabilmente nascosto qui proprio per questo tipo di emergenza.',
    discoveryMethod: 'npc_hint',
    requiredNpcQuestId: 'npc_hannah',
    searchChance: 25,
    hint: 'Hannah ha menzionato un nascondiglio vicino alla grata principale dei condotti... forse vale la pena esplorare quella zona.',
    lootTable: [
      { itemId: 'ammo_magnum', chance: 100, quantity: 4 },
      { itemId: 'ammo_grenade', chance: 100, quantity: 2 },
    ],
    uniqueItem: { itemId: 'rocket_launcher', quantity: 1 },
  },

  // ==========================================
  // LAB ARCHIVE
  // ==========================================
  secret_lab_archive: {
    id: 'secret_lab_archive',
    locationId: 'laboratory_entrance',
    name: 'Archivio Segreto Umbrella',
    description: 'Una parete nel corridoio principale presenta delle micro-fratture sismiche — troppo regolari per essere naturali. Dall\'altra parte si trova l\'archivio top secret del laboratorio: file su file di documenti classificati, blueprints di creature che non dovrebbero esistere, e i nastri originali degli esperimenti Umbrella. È la prova definitiva della cospirazione.',
    discoveryMethod: 'search',
    searchChance: 10,
    hint: 'Una parete ha delle anomalie strutturali... le fratture sembrano troppo regolari. Qualcuno ha costruito una stanza nascosta qui.',
    lootTable: [
      { itemId: 'spray', chance: 100, quantity: 2 },
      { itemId: 'ammo_magnum', chance: 100, quantity: 6 },
    ],
  },
};
