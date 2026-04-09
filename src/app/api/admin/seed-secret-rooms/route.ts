import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

const SEED_SECRET_ROOMS = [
  {
    id: 'secret_rpd_evidence_room',
    locationId: 'rpd_station',
    name: 'Stanza Prove Nascosta',
    description: "Dietro una parete finta nell'armeria si nasconde una piccola stanza blindata. Scaffali pieni di prove sequestrate, cassette di sicurezza, e vecchi dossier della polizia. È come un museo dei crimini di Raccoon City — e tra questi, prove schiaccianti contro la Umbrella Corporation.",
    discoveryMethod: 'search',
    searchChance: 15,
    hint: "Nelle pareti dell'armeria c'è qualcosa di strano... una rientranza che non corrisponde alla pianta del distretto.",
    lootTable: JSON.stringify([
      { itemId: 'ammo_pistol', chance: 100, quantity: 8 },
      { itemId: 'ammo_shotgun', chance: 100, quantity: 4 },
    ]),
    uniqueItemId: 'lockpick',
    uniqueItemQuantity: 1,
    sortOrder: 0,
  },
  {
    id: 'secret_hospital_basement',
    locationId: 'hospital_district',
    name: "Cantina Segreta dell'Ospedale",
    description: "Un'antica porta di metallo nascosta dietro un armadietto medico nel reparto pediatria. Una scala ripida scende nella cantina segreta — un piccolo magazzino di provette e farmaci sperimentali della Umbrella. L'aria è gelida e le pareti sono coperte di muffa verde. Qualcosa è stato conservato qui per molto tempo.",
    discoveryMethod: 'document',
    requiredDocumentId: 'doc_patient_record',
    searchChance: 0,
    hint: "Il documento parla di un \"Reposito B3\" sotto l'ospedale... potrebbe esserci un passaggio nascosto nel reparto pediatrico.",
    lootTable: JSON.stringify([
      { itemId: 'herb_red', chance: 100, quantity: 2 },
      { itemId: 'spray', chance: 100, quantity: 1 },
    ]),
    uniqueItemId: 'magnum',
    uniqueItemQuantity: 1,
    sortOrder: 1,
  },
  {
    id: 'secret_sewers_cache',
    locationId: 'sewers',
    name: 'Nascondiglio nei Condotti',
    description: 'Una grata arrugginita nasconde una grotta artificiale scavata dai lavoratori della Umbrella per nascondere rifornimenti di emergenza. Scatole militari impilate contro le pareti, munizioni per ogni tipo di arma, e qualcosa di più grande — un lanciarazzi con un solo colpo, probabilmente nascosto qui proprio per questo tipo di emergenza.',
    discoveryMethod: 'npc_hint',
    requiredNpcQuestId: 'quest_hannah_sewers',
    searchChance: 25,
    hint: 'Hannah ha menzionato un nascondiglio vicino alla grata principale dei condotti... forse vale la pena esplorare quella zona.',
    lootTable: JSON.stringify([
      { itemId: 'ammo_magnum', chance: 100, quantity: 4 },
      { itemId: 'ammo_grenade', chance: 100, quantity: 2 },
    ]),
    uniqueItemId: 'rocket_launcher',
    uniqueItemQuantity: 1,
    sortOrder: 2,
  },
  {
    id: 'secret_lab_archive',
    locationId: 'laboratory_entrance',
    name: 'Archivio Segreto Umbrella',
    description: "Una parete nel corridoio principale presenta delle micro-fratture sismiche — troppo regolari per essere naturali. Dall'altra parte si trova l'archivio top secret del laboratorio: file su file di documenti classificati, blueprints di creature che non dovrebbero esistere, e i nastri originali degli esperimenti Umbrella. È la prova definitiva della cospirazione.",
    discoveryMethod: 'search',
    searchChance: 10,
    hint: 'Una parete ha delle anomalie strutturali... le fratture sembrano troppo regolari. Qualcuno ha costruito una stanza nascosta qui.',
    lootTable: JSON.stringify([
      { itemId: 'spray', chance: 100, quantity: 2 },
      { itemId: 'ammo_magnum', chance: 100, quantity: 6 },
    ]),
    sortOrder: 3,
  },
];

export async function POST() {
  try {
    await db.secretRoom.deleteMany();

    for (const room of SEED_SECRET_ROOMS) {
      await db.secretRoom.create({ data: room });
    }

    return NextResponse.json({
      message: `✅ Seeded ${SEED_SECRET_ROOMS.length} secret rooms`,
      count: SEED_SECRET_ROOMS.length,
    });
  } catch (error) {
    console.error('[seed-secret-rooms] Failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
