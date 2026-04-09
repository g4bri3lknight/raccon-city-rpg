'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { ENEMIES, LOCATIONS, NPCS, ITEMS, DOCUMENTS } from '@/game/data/loader';
import {
  Heart, Package, Key, Crosshair, Bug, Skull, MapPin,
  Shield, Zap, ChevronDown, ChevronUp, X, Flame, Users, Settings,
  FileText, Search
} from 'lucide-react';

// Static level options (no DB dependency)
const LEVEL_OPTIONS = [1, 5, 10, 15, 20, 30, 50];

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/[0.08] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
      >
        <span className="text-yellow-400">{icon}</span>
        <span className="text-xs font-bold text-white/80 flex-1">{title}</span>
        {open ? <ChevronUp className="w-3 h-3 text-white/40" /> : <ChevronDown className="w-3 h-3 text-white/40" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 space-y-1.5 bg-white/[0.02]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DebugButton({ label, icon, onClick, variant = 'default' }: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}) {
  const colorClass = variant === 'danger'
    ? 'border-red-500/30 text-red-300 hover:bg-white/[0.06]'
    : variant === 'success'
    ? 'border-green-500/30 text-green-300 hover:bg-white/[0.06]'
    : 'border-white/[0.08] text-white/60 hover:bg-white/[0.06]';
  return (
    <button
      className={`w-full flex items-center justify-start gap-2 text-[11px] font-medium h-8 px-2.5 rounded-md border transition-colors bg-transparent ${colorClass}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

/** Searchable dropdown for picking an item or document */
function SearchablePicker<T extends { id: string; name: string }>({
  items,
  onSelect,
  placeholder,
  renderItem,
}: {
  items: T[];
  onSelect: (item: T) => void;
  placeholder: string;
  renderItem?: (item: T) => React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) || i.id.toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div className="space-y-1">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full text-[10px] bg-white/[0.04] border border-white/[0.1] rounded-md pl-7 pr-2 py-1.5 text-white/80 placeholder-white/25 focus:outline-none focus:border-yellow-500/40"
        />
      </div>
      <div className="max-h-[180px] overflow-y-auto debug-scrollbar space-y-0.5">
        {filtered.length === 0 ? (
          <p className="text-[10px] text-white/30 italic text-center py-2">Nessun risultato</p>
        ) : (
          filtered.slice(0, 50).map(item => (
            <button
              key={item.id}
              onClick={() => { onSelect(item); setQuery(''); }}
              className="w-full text-[10px] px-2 py-1.5 rounded border border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/[0.15] text-left transition-colors flex items-center gap-1.5"
            >
              {renderItem ? renderItem(item) : <span className="truncate">{item.name}</span>}
            </button>
          ))
        )}
        {filtered.length > 50 && (
          <p className="text-[9px] text-white/20 text-center py-1">...e altri {filtered.length - 50} risultati (refina la ricerca)</p>
        )}
      </div>
    </div>
  );
}

export default function DebugPanel() {
  const debugOpen = useGameStore(s => s.debugOpen);
  const godMode = useGameStore(s => s.godMode);
  const party = useGameStore(s => s.party);
  const phase = useGameStore(s => s.phase);
  const dataVersion = useGameStore(s => s.dataVersion);
  const collectedDocuments = useGameStore(s => s.collectedDocuments);

  const {
    debugHealAll,
    debugGiveAllItems,
    debugGiveAllKeys,
    debugGiveAmmo,
    debugApplyStatus,
    debugRemoveStatus,
    debugSpawnEnemy,
    debugSetLevel,
    debugTeleport,
    debugKillAllEnemies,
    debugToggleGodMode,
    debugSpawnCollectible,
    debugGiveAllRibbons,
    debugSpawnItem,
    debugSpawnDocument,
  } = useGameStore();

  // Reactive data lookups — recomputed when dataVersion changes (after DB load / admin CRUD)
  const enemyOptions = useMemo(() =>
    Object.keys(ENEMIES).map(id => ({
      id,
      name: ENEMIES[id].name,
      isBoss: ENEMIES[id].isBoss,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataVersion],
  );

  const locationOptions = useMemo(() =>
    Object.keys(LOCATIONS).map(id => ({
      id,
      name: LOCATIONS[id].name,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataVersion],
  );

  const npcList = useMemo(() =>
    Object.values(NPCS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataVersion],
  );

  const itemList = useMemo(() =>
    Object.keys(ITEMS).map(id => ({
      id,
      name: ITEMS[id].name,
      icon: ITEMS[id].icon,
      type: ITEMS[id].type,
      rarity: ITEMS[id].rarity,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataVersion],
  );

  const docList = useMemo(() =>
    Object.keys(DOCUMENTS).map(id => ({
      id,
      name: DOCUMENTS[id].title,
      type: DOCUMENTS[id].type,
      rarity: DOCUMENTS[id].rarity,
      isSecret: DOCUMENTS[id].isSecret,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataVersion],
  );

  const close = () => useGameStore.setState({ debugOpen: false });

  if (!debugOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ duration: 0.2 }}
        className="fixed right-0 top-0 bottom-0 z-[100] w-[280px] sm:w-[320px] flex flex-col"
        style={{
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(40px) saturate(120%)',
          WebkitBackdropFilter: 'blur(40px) saturate(120%)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-4px 0 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">🐛</span>
            <span className="text-xs font-black tracking-wider text-yellow-400">DEBUG PANEL</span>
            {godMode && (
              <span className="text-[9px] bg-red-700 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
                GOD MODE
              </span>
            )}
          </div>
          <button onClick={close} className="text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 debug-scrollbar">
          <p className="text-[9px] text-gray-500 text-center">
            Premi <kbd className="px-1 py-0.5 bg-gray-800 rounded text-[8px] font-mono">F2</kbd> per aprire/chiudere
          </p>

          {/* ── Quick Actions ── */}
          <Section title="Azioni Rapide" icon={<Zap className="w-3.5 h-3.5" />} defaultOpen={true}>
            <DebugButton label="Curare Tutto (MAX HP)" icon={<Heart className="w-3.5 h-3.5" />} onClick={debugHealAll} variant="success" />
            <DebugButton label="Uccidi Tutti i Nemici" icon={<Skull className="w-3.5 h-3.5" />} onClick={debugKillAllEnemies} variant="danger" />
            <DebugButton label={`God Mode: ${godMode ? 'ON' : 'OFF'}`} icon={<Shield className="w-3.5 h-3.5" />} onClick={debugToggleGodMode} variant={godMode ? 'danger' : 'default'} />
          </Section>

          {/* ── Items ── */}
          <Section title="Oggetti" icon={<Package className="w-3.5 h-3.5" />}>
            <DebugButton label="Tutti gli Oggetti (x5)" icon={<Package className="w-3.5 h-3.5" />} onClick={debugGiveAllItems} />
            <DebugButton label="Tutte le Chiavi + Strumenti" icon={<Key className="w-3.5 h-3.5" />} onClick={debugGiveAllKeys} />
            <DebugButton label="50 Munizioni per Arma" icon={<Crosshair className="w-3.5 h-3.5" />} onClick={debugGiveAmmo} />
          </Section>

          {/* ── Spawn Item ── */}
          <Section title="Spawn Oggetto" icon={<Package className="w-3.5 h-3.5" />}>
            <p className="text-[9px] text-white/30 mb-1">Cerca e spawna un oggetto nell'inventario del primo personaggio vivo.</p>
            <SearchablePicker
              items={itemList}
              onSelect={item => debugSpawnItem(item.id)}
              placeholder="Cerca oggetto..."
              renderItem={item => (
                <>
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate flex-1">{item.name}</span>
                  <span className="text-[8px] text-white/20 shrink-0">{item.type}</span>
                </>
              )}
            />
          </Section>

          {/* ── Spawn Document ── */}
          <Section title="Spawn Documento" icon={<FileText className="w-3.5 h-3.5" />}>
            <p className="text-[9px] text-white/30 mb-1">
              Aggiungi un documento ai raccolti ({collectedDocuments.length}/{docList.length}).
            </p>
            <SearchablePicker
              items={docList}
              onSelect={doc => debugSpawnDocument(doc.id)}
              placeholder="Cerca documento..."
              renderItem={doc => {
                const already = collectedDocuments.includes(doc.id);
                return (
                  <>
                    <span className={`truncate flex-1 ${already ? 'line-through text-white/20' : ''}`}>
                      {doc.name}
                    </span>
                    {already && <span className="text-[8px] text-white/20 shrink-0">✓</span>}
                    {doc.isSecret && !already && <span className="text-[8px] text-yellow-400/60 shrink-0">🔒</span>}
                  </>
                );
              }}
            />
          </Section>

          {/* ── Collectibles ── */}
          <Section title="Collezionabili" icon={<span className="text-sm">🎀</span>}>
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] text-white/40">Run: {useGameStore.getState().collectedRibbons}/10</span>
              <span className="text-[10px] text-white/40">Totale: {useGameStore.getState().persistentRibbons}/10</span>
            </div>
            <DebugButton label="Spawn Nastro (+1)" icon={<span className="text-sm">🎀</span>} onClick={debugSpawnCollectible} />
            <DebugButton label="Sblocca Tutti i Nastri (10)" icon={<span className="text-sm">✨</span>} onClick={debugGiveAllRibbons} variant="success" />
          </Section>

          {/* ── Status Effects ── */}
          <Section title="Effetti di Status" icon={<Bug className="w-3.5 h-3.5" />}>
            {party.filter(p => p.currentHp > 0).length === 0 ? (
              <p className="text-[10px] text-gray-500 italic text-center py-1">
                {party.length === 0 ? 'Nessun personaggio — avvia una partita' : 'Tutti i personaggi sono K.O.'}
              </p>
            ) : (
            <div className="space-y-1">
              {party.filter(p => p.currentHp > 0).map(char => (
                <div key={char.id} className="border border-white/[0.06] rounded-md p-2 bg-white/[0.03]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-white/80">
                      {char.name} <span className="text-gray-500">(Lv.{char.level})</span>
                    </span>
                    <span className="text-[9px] text-white/40">{char.currentHp}/{char.maxHp} HP</span>
                  </div>
                  {char.statusEffects.length > 0 && (
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-[9px] text-white/40">Status: {char.statusEffects.map(s => s === 'poison' ? '☠️' : '🩸').join(' ')}</span>
                      <button
                        onClick={() => debugRemoveStatus(char.id)}
                        className="text-[9px] text-blue-400 hover:text-blue-300 ml-auto"
                      >Rimuovi</button>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button
                      onClick={() => debugApplyStatus(char.id, 'poison')}
                      className="flex-1 text-[9px] px-1.5 py-1 bg-white/[0.04] border border-purple-400/30 text-purple-300 rounded hover:bg-white/[0.08] transition-colors"
                    >☠️ Veleno</button>
                    <button
                      onClick={() => debugApplyStatus(char.id, 'bleeding')}
                      className="flex-1 text-[9px] px-1.5 py-1 bg-white/[0.04] border border-red-400/30 text-red-300 rounded hover:bg-white/[0.08] transition-colors"
                    >🩸 Sangue</button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </Section>

          {/* ── Level ── */}
          <Section title="Livello" icon={<Flame className="w-3.5 h-3.5" />}>
            <div className="flex flex-wrap gap-1">
              {LEVEL_OPTIONS.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => debugSetLevel(lvl)}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    party[0]?.level === lvl
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'
                      : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white/60 hover:border-white/[0.15]'
                  }`}
                >Lv.{lvl}</button>
              ))}
            </div>
          </Section>

          {/* ── Spawn Enemy ── */}
          <Section title="Spawn Nemico" icon={<Skull className="w-3.5 h-3.5" />}>
            {enemyOptions.length === 0 ? (
              <p className="text-[10px] text-gray-500 italic text-center py-1">Dati nemici non ancora caricati</p>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {enemyOptions.map(enemy => (
                  <button
                    key={enemy.id}
                    onClick={() => debugSpawnEnemy(enemy.id)}
                    className={`text-[10px] px-2 py-1.5 rounded border text-left transition-colors ${
                      enemy.isBoss
                        ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                        : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:bg-white/[0.06] hover:text-red-300 hover:border-red-500/30'
                    }`}
                  >
                    {enemy.isBoss ? '⭐' : '👾'} {enemy.name}
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* ── Teleport ── */}
          <Section title="Teletrasporto" icon={<MapPin className="w-3.5 h-3.5" />}>
            {locationOptions.length === 0 ? (
              <p className="text-[10px] text-gray-500 italic text-center py-1">Dati location non ancora caricati</p>
            ) : (
              <div className="space-y-1">
                {locationOptions.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => debugTeleport(loc.id)}
                    className={`w-full text-[10px] px-2 py-1.5 rounded border text-left transition-colors ${
                      useGameStore.getState().currentLocationId === loc.id
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'
                        : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:bg-white/[0.06] hover:text-white/60 hover:border-white/[0.15]'
                    }`}
                  >
                    📍 {loc.name}
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* ── Game State Info ── */}
          <Section title="Info Stato" icon={<Bug className="w-3.5 h-3.5" />}>
            <div className="space-y-1 text-[9px] text-white/40">
              <div className="flex justify-between"><span>Phase:</span><span className="text-white/70 font-mono">{phase}</span></div>
              <div className="flex justify-between"><span>Party:</span><span className="text-white/70 font-mono">{party.length}</span></div>
              <div className="flex justify-between"><span>Turn:</span><span className="text-white/70 font-mono">{useGameStore.getState().turnCount}</span></div>
              <div className="flex justify-between"><span>Location:</span><span className="text-white/70 font-mono">{useGameStore.getState().currentLocationId}</span></div>
              <div className="flex justify-between"><span>Ribbons:</span><span className="text-white/70 font-mono">{useGameStore.getState().collectedRibbons}/10</span></div>
              <div className="flex justify-between"><span>Persist Ribbons:</span><span className="text-white/70 font-mono">{useGameStore.getState().persistentRibbons}/10</span></div>
              <div className="flex justify-between"><span>Documents:</span><span className="text-white/70 font-mono">{collectedDocuments.length}/{docList.length}</span></div>
              <div className="flex justify-between"><span>New Game+:</span><span className="text-white/70 font-mono">{useGameStore.getState().isNewGamePlus ? 'YES' : 'NO'}</span></div>
            </div>
          </Section>

          {/* ── AI / NPC / Quest ── */}
          <Section title="AI / NPC / Quest" icon={<Users className="w-3.5 h-3.5" />}>
            {npcList.length === 0 ? (
              <p className="text-[10px] text-gray-500 italic text-center py-1">Dati NPC non ancora caricati</p>
            ) : (
              <>
                <DebugButton
                  label="Incontri NPC locale"
                  icon={<span className="text-sm">💬</span>}
                  onClick={() => {
                    const locId = useGameStore.getState().currentLocationId;
                    const localNpcs = npcList.filter(n => n.locationId === locId);
                    if (localNpcs.length > 0) {
                      useGameStore.getState().encounterNpc(localNpcs[0].id);
                    }
                  }}
                />
                <DebugButton
                  label="Quest Casuale (NPC + Teleport)"
                  icon={<span className="text-sm">🎲</span>}
                  variant="success"
                  onClick={() => {
                    const state = useGameStore.getState();
                    // Pick a random NPC that has a quest
                    const npcsWithQuest = npcList.filter(n => n.quest);
                    if (npcsWithQuest.length === 0) return;
                    const randomNpc = npcsWithQuest[Math.floor(Math.random() * npcsWithQuest.length)];
                    // Close any active dialog first
                    useGameStore.setState({ activeNpc: null });
                    // Teleport to NPC location if needed
                    if (state.currentLocationId !== randomNpc.locationId) {
                      useGameStore.getState().debugTeleport(randomNpc.locationId);
                    }
                    // Encounter after a short delay to allow teleport to settle
                    setTimeout(() => {
                      useGameStore.getState().encounterNpc(randomNpc.id);
                    }, 150);
                  }}
                />
                <DebugButton
                  label="+1 Progress Quest Attiva"
                  icon={<span className="text-sm">📈</span>}
                  onClick={() => {
                    const state = useGameStore.getState();
                    // Find first incomplete quest
                    const incompleteEntry = Object.entries(state.npcQuestProgress).find(
                      ([_, progress]) => !progress.completed
                    );
                    if (!incompleteEntry) {
                      useGameStore.setState({
                        messageLog: [...state.messageLog, '[DEBUG] ⚠️ Nessuna quest attiva da avanzare.'],
                      });
                      return;
                    }
                    const [questId, progress] = incompleteEntry;
                    const npc = npcList.find(n => n.quest?.id === questId);
                    const targetCount = npc?.quest?.targetCount || 999;
                    const newCount = Math.min(progress.currentCount + 1, targetCount);
                    const completed = newCount >= targetCount;
                    const updatedProgress = { ...state.npcQuestProgress, [questId]: { currentCount: newCount, completed } };
                    useGameStore.setState({
                      npcQuestProgress: updatedProgress,
                      messageLog: [...state.messageLog, `[DEBUG] 📈 Quest "${npc?.quest?.name || questId}": ${newCount}/${targetCount}${completed ? ' ✅ COMPLETATA!' : ''}`],
                    });
                  }}
                />
                <div className="text-[9px] text-white/30 uppercase tracking-wider mt-1 mb-1">Tutti gli NPC — Teleporta + Incontra</div>
                {npcList.map(npc => (
                  <button
                    key={npc.id}
                    onClick={() => {
                      const state = useGameStore.getState();
                      if (state.currentLocationId !== npc.locationId) {
                        useGameStore.getState().debugTeleport(npc.locationId);
                      }
                      setTimeout(() => {
                        useGameStore.getState().encounterNpc(npc.id);
                      }, 100);
                    }}
                    className="w-full text-[10px] px-2 py-1.5 rounded border text-left transition-colors border-white/[0.08] text-white/40 hover:bg-white/[0.06] hover:text-white/60 hover:border-white/[0.15] flex items-center gap-2"
                  >
                    <span className="text-xs">{npc.portrait}</span>
                    <span className="flex-1 truncate">{npc.name}</span>
                    <span className="text-[8px] text-white/20 truncate max-w-[80px]">{LOCATIONS[npc.locationId]?.name}</span>
                    <span className="text-[9px] text-cyan-400/60 shrink-0">↕️</span>
                  </button>
                ))}
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => {
                      const state = useGameStore.getState();
                      const updatedProgress = { ...state.npcQuestProgress };
                      for (const npc of npcList) {
                        if (npc.quest) {
                          updatedProgress[npc.quest.id] = { currentCount: npc.quest.targetCount, completed: true };
                        }
                      }
                      useGameStore.setState({
                        npcQuestProgress: updatedProgress,
                        messageLog: [...state.messageLog, '[DEBUG] ✅ Tutte le quest completate!'],
                      });
                    }}
                    className="flex-1 text-[10px] px-2 py-1.5 rounded border border-green-500/30 text-green-300 hover:bg-green-950/20 transition-colors"
                  >
                    ✅ Completa Tutte le Quest
                  </button>
                  <button
                    onClick={() => {
                      const state = useGameStore.getState();
                      useGameStore.setState({
                        npcQuestProgress: {},
                        npcsEncountered: [],
                        messageLog: [...state.messageLog, '[DEBUG] 🔄 Tutte le quest resettate.'],
                      });
                    }}
                    className="flex-1 text-[10px] px-2 py-1.5 rounded border border-red-500/30 text-red-300 hover:bg-red-950/20 transition-colors"
                  >
                    🔄 Reset Quest
                  </button>
                </div>
              </>
            )}
          </Section>

          {/* ── Admin Panel ── */}
          <Section title="Admin Panel" icon={<Settings className="w-3.5 h-3.5" />}>
            <p className="text-[9px] text-white/30 mb-1">CRUD per oggetti, quest, eventi, documenti, suoni, immagini.</p>
            <DebugButton
              label="Apri Admin Panel (F3)"
              icon={<Settings className="w-3.5 h-3.5" />}
              onClick={() => {
                // Dispatch F3 event to open admin panel
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3' }));
              }}
              variant="success"
            />
          </Section>


        </div>
      </motion.div>
    </AnimatePresence>
  );
}
