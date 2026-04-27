import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api-utils';

// Seed data — extracted from the existing seed-data/quest-chains.ts
const CHAINS = [
  {
    id: 'chain_sangue_infetto',
    npcId: 'npc_dr_chen',
    name: 'Sangue Infetto',
    description: 'Il Dr. Chen ha bisogno del tuo aiuto per gestire dei campioni di sangue infetto. Una missione che metterà alla prova la tua coscienza.',
    sortOrder: 0,
  },
  {
    id: 'chain_ombre_cimitero',
    npcId: 'npc_gravedigger',
    name: 'Ombre nel Cimitero',
    description: 'Pietro il Becchino ha bisogno di aiuto per affrontare le presenze oscure che infestano il cimitero.',
    sortOrder: 1,
  },
  {
    id: 'chain_il_traditore',
    npcId: 'npc_soldier_reyes',
    name: 'Il Traditore',
    description: 'Soldato Reyes sospetta che ci sia una spia tra i sopravvissuti. Aiutalo a scoprire la verità.',
    sortOrder: 2,
  },
];

const STEPS = [
  // Chain 1: Sangue Infetto
  { id: 'chain_sangue_step_1', chainId: 'chain_sangue_infetto', stepIndex: 0, description: "Porta 2 Antidoti al Dr. Chen per curare i sopravvissuti.", type: 'fetch', targetId: 'antidote', targetCount: 2, nextStepId: 'chain_sangue_step_2', rewardItems: '[]', rewardExp: 20, rewardDialogue: '["Grazie per gli antidoti. Ora ho bisogno del tuo aiuto per qualcosa di più delicato..."]', branchChoice: '', sortOrder: 0 },
  { id: 'chain_sangue_step_2', chainId: 'chain_sangue_infetto', stepIndex: 1, description: "Parla con l'Infermiera Chiara nell'Ospedale Abbandonato. Ha informazioni cruciali sui campioni.", type: 'talk', targetId: 'npc_nurse_ghost', targetCount: 1, nextStepId: 'chain_sangue_step_3', rewardItems: '[]', rewardExp: 0, rewardDialogue: '["L\'Infermiera Chiara ti ha dato le informazioni necessarie. Ora devi decidere cosa fare."]', branchChoice: '', sortOrder: 1 },
  { id: 'chain_sangue_step_3', chainId: 'chain_sangue_infetto', stepIndex: 2, description: 'Scegli il destino dei campioni di sangue infetto.', type: 'choose', targetId: '', targetCount: 0, nextStepId: '', rewardItems: '[]', rewardExp: 0, rewardDialogue: '["La tua scelta avrà conseguenze permanenti. Scegli con attenzione."]', branchChoice: '{"prompt":"Cosa vuoi fare con i campioni di sangue infetto?","choices":[{"text":"Distruggere i campioni","description":"Distruggi tutto nel reparto abbandonato per impedire che cada nelle mani sbagliate.","nextStepId":"chain_sangue_step_3a","flag":"destroyed_samples"},{"text":"Portare al laboratorio","description":"Porta i campioni al laboratorio Umbrella. Rischioso, ma potrebbe portare a una cura.","nextStepId":"chain_sangue_step_3b","flag":"delivered_samples"}]}', sortOrder: 2 },
  { id: 'chain_sangue_step_3a', chainId: 'chain_sangue_infetto', stepIndex: 3, description: "Esplora l'Ospedale Abbandonato per distruggere i campioni nel reparto segreto.", type: 'explore', targetId: 'abandoned_hospital', targetCount: 1, nextStepId: '', rewardItems: '[{"itemId":"spray","quantity":2}]', rewardExp: 30, rewardDialogue: '["Hai distrutto i campioni. Il Dr. Chen ti ringrazia per aver protetto i sopravvissuti."]', branchChoice: '', sortOrder: 3 },
  { id: 'chain_sangue_step_3b', chainId: 'chain_sangue_infetto', stepIndex: 4, description: "Esplora l'ingresso del laboratorio Umbrella per consegnare i campioni.", type: 'explore', targetId: 'laboratory_entrance', targetCount: 1, nextStepId: '', rewardItems: '[{"itemId":"rocket_launcher","quantity":1},{"itemId":"ammo_grenade","quantity":2}]', rewardExp: 30, rewardDialogue: '["Hai consegnato i campioni. I ricercatori sono sbalorditi dalle tue capacità di sopravvivenza. Ti ricompensano generosamente."]', branchChoice: '', sortOrder: 4 },

  // Chain 2: Ombre nel Cimitero
  { id: 'chain_ombre_step_1', chainId: 'chain_ombre_cimitero', stepIndex: 0, description: 'Elimina 3 zombie nel cimitero per rendere sicura la zona.', type: 'kill', targetId: 'zombie', targetCount: 3, nextStepId: 'chain_ombre_step_2', rewardItems: '[]', rewardExp: 15, rewardDialogue: '["Le creature sono state eliminate... per ora. Ma Pietro ha bisogno di altro aiuto."]', branchChoice: '', sortOrder: 0 },
  { id: 'chain_ombre_step_2', chainId: 'chain_ombre_cimitero', stepIndex: 1, description: 'Trova 1 Torcia per esplorare le aree più buie del cimitero.', type: 'fetch', targetId: 'flashlight', targetCount: 1, nextStepId: 'chain_ombre_step_3', rewardItems: '[]', rewardExp: 15, rewardDialogue: '["Con questa torcia potrai vedere nelle tombe più oscure. Ora devi prendere una decisione..."]', branchChoice: '', sortOrder: 1 },
  { id: 'chain_ombre_step_3', chainId: 'chain_ombre_cimitero', stepIndex: 2, description: 'Scegli come procedere nelle profondità del cimitero.', type: 'choose', targetId: '', targetCount: 0, nextStepId: '', rewardItems: '[]', rewardExp: 0, rewardDialogue: '["Il destino del cimitero è nelle tue mani. Scegli saggiamente."]', branchChoice: '{"prompt":"Cosa vuoi fare nelle profondità del cimitero?","choices":[{"text":"Esplorare le catacombe","description":"Scopri i segreti nascosti sotto le tombe antiche. Potrebbe essere pericoloso.","nextStepId":"chain_ombre_step_3a","flag":"explored_catacombs"},{"text":"Seppellire i morti","description":"Dai pace alle anime tormentate raccogliendo bende per le salme.","nextStepId":"chain_ombre_step_3b","flag":"buried_dead"}]}', sortOrder: 2 },
  { id: 'chain_ombre_step_3a', chainId: 'chain_ombre_cimitero', stepIndex: 3, description: "Esplora il cimitero per trovare l'entrata delle catacombe segrete.", type: 'explore', targetId: 'cemetery', targetCount: 1, nextStepId: '', rewardItems: '[{"itemId":"key_lab","quantity":1}]', rewardExp: 25, rewardDialogue: '["Nelle catacombe hai trovato una chiave del laboratorio Umbrella! Questo potrebbe esserti utile...","Pietro trema: \\"Quello che hai trovato laggiù... non doveva essere scoperto.\\""]', branchChoice: '', sortOrder: 3 },
  { id: 'chain_ombre_step_3b', chainId: 'chain_ombre_cimitero', stepIndex: 4, description: 'Raccogli 3 Bende per preparare le salme per la sepoltura dignitosa.', type: 'fetch', targetId: 'bandage', targetCount: 3, nextStepId: '', rewardItems: '[{"itemId":"herb_mixed","quantity":2},{"itemId":"amulet","quantity":1}]', rewardExp: 25, rewardDialogue: '["Hai dato una degna sepoltura ai morti. Le anime sembrano essersi pacificate.","Pietro piange: \\"Grazie... per la prima volta da settimane il cimitero è in pace.\\""]', branchChoice: '', sortOrder: 4 },

  // Chain 3: Il Traditore
  { id: 'chain_traditore_step_1', chainId: 'chain_il_traditore', stepIndex: 0, description: 'Porta 3 Munizioni Pistola a Reyes per armare le difese.', type: 'fetch', targetId: 'ammo_pistol', targetCount: 3, nextStepId: 'chain_traditore_step_2', rewardItems: '[]', rewardExp: 15, rewardDialogue: '["Reyes controlla le munizioni: \\"Bene. Ora possiamo iniziare a pattugliare seriamente.\\""]', branchChoice: '', sortOrder: 0 },
  { id: 'chain_traditore_step_2', chainId: 'chain_il_traditore', stepIndex: 1, description: 'Elimina 2 Hunter per dimostrare le tue capacità a Reyes.', type: 'kill', targetId: 'hunter', targetCount: 2, nextStepId: 'chain_traditore_step_3', rewardItems: '[]', rewardExp: 25, rewardDialogue: '["Reyes è impressionato: \\"Non male. Ora posso fidarmi di te per la prossima fase.\\""]', branchChoice: '', sortOrder: 1 },
  { id: 'chain_traditore_step_3', chainId: 'chain_il_traditore', stepIndex: 2, description: "Trova 1 Nastro d'Inchiostro per documentare le prove del tradimento.", type: 'fetch', targetId: 'ink_ribbon', targetCount: 1, nextStepId: 'chain_traditore_step_4', rewardItems: '[]', rewardExp: 15, rewardDialogue: '["Con le prove documentate, è ora di decidere a chi consegnarle..."]', branchChoice: '', sortOrder: 2 },
  { id: 'chain_traditore_step_4', chainId: 'chain_il_traditore', stepIndex: 3, description: 'Scegli a chi consegnare le prove del tradimento.', type: 'choose', targetId: '', targetCount: 0, nextStepId: '', rewardItems: '[]', rewardExp: 0, rewardDialogue: '["Questo è il momento cruciale. La tua scelta potrebbe cambiare tutto."]', branchChoice: '{"prompt":"A chi vuoi consegnare le prove del tradimento?","choices":[{"text":"Consegnare al capo","description":"Parla con il Dr. Voss al laboratorio. Potrebbe avere i mezzi per usare le prove.","nextStepId":"chain_traditore_step_4a","flag":"delivered_to_voss"},{"text":"Tenere per sé","description":"Conserva le prove. La verità è un\'arma potente... e pericolosa.","nextStepId":"chain_traditore_step_4b","flag":"kept_evidence"}]}', sortOrder: 3 },
  { id: 'chain_traditore_step_4a', chainId: 'chain_il_traditore', stepIndex: 4, description: 'Parla con il Dr. Voss al laboratorio per consegnare le prove.', type: 'talk', targetId: 'npc_umbrella_scientist', targetCount: 1, nextStepId: '', rewardItems: '[{"itemId":"magnum","quantity":1},{"itemId":"ammo_magnum","quantity":6}]', rewardExp: 40, rewardDialogue: '["Il Dr. Voss è scioccato: \\"Queste prove... potrebbero far cadere l\'intera Umbrella. Tieni, prendi questo — te lo meriti.\\"","Reyes annuisce: \\"Hai fatto la cosa giusta. La verità deve venire alla luce.\\""]', branchChoice: '', sortOrder: 4 },
  { id: 'chain_traditore_step_4b', chainId: 'chain_il_traditore', stepIndex: 5, description: 'Le prove sono al sicuro con te. La missione è completa.', type: 'choose', targetId: '', targetCount: 0, nextStepId: '', rewardItems: '[]', rewardExp: 100, rewardDialogue: '["Reyes ti guarda diffidente: \\"Capisco la tua scelta. Le prove sono più al sicuro con te che con chiunque altro.\\""]', branchChoice: '{"prompt":"Reyes ha un\'ultima cosa per te...","choices":[{"text":"Accetta la ricompensa segreta","description":"Reyes ti consegna un giubbotto segreto della Umbrella.","nextStepId":"","flag":"accepted_secret_reward"}]}', sortOrder: 5 },
];

const FINAL_REWARDS = [
  { chainId: 'chain_sangue_infetto', rewardItems: '[]', rewardExp: 80, dialogue: '["Il Dr. Chen ti guarda con gratitudine: \\"Non so cosa avremmo fatto senza di te. Sei una persona eccezionale.\\"","Missione \\"Sangue Infetto\\" completata! +80 EXP"]' },
  { chainId: 'chain_ombre_cimitero', rewardItems: '[]', rewardExp: 60, dialogue: '["Pietro il Becchino si inginocchia: \\"Sei un anima nobile. Che Dio ti benedica in questo inferno.\\"","Missione \\"Ombre nel Cimitero\\" completata! +60 EXP"]' },
  { chainId: 'chain_il_traditore', rewardItems: '[{"itemId":"vest_umbrella","quantity":1}]', rewardExp: 100, dialogue: '["Reyes ti saluta militarmente: \\"Sei un soldato eccezionale. Se sopravviviamo a questo... ti offro una birra.\\"","Missione \\"Il Traditore\\" completata! +100 EXP + Giubbotto Umbrella!"]' },
];

export async function POST(req: Request) {
  try {
    let created = 0;
    let skipped = 0;

    // Seed chains
    for (const chain of CHAINS) {
      const existing = await db.questChain.findUnique({ where: { id: chain.id } });
      if (!existing) {
        await db.questChain.create({ data: chain });
        created++;
      } else {
        skipped++;
      }
    }

    // Seed steps
    for (const step of STEPS) {
      const existing = await db.questChainStep.findUnique({ where: { id: step.id } });
      if (!existing) {
        await db.questChainStep.create({ data: step });
        created++;
      } else {
        skipped++;
      }
    }

    // Seed final rewards
    for (const reward of FINAL_REWARDS) {
      const existing = await db.questChainFinalReward.findUnique({ where: { chainId: reward.chainId } });
      if (!existing) {
        await db.questChainFinalReward.create({ data: reward });
        created++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      message: 'Quest chains seeded',
      created,
      skipped,
      total: created + skipped,
    });
  } catch (error) {
    return safeErrorResponse(error, '[Seed Quest Chains]');
  }
}
