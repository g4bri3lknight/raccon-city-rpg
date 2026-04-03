'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { ENEMIES } from '@/game/data/enemies';
import { LOCATIONS } from '@/game/data/locations';
import { Button } from '@/components/ui/button';
import {
  Heart, Package, Key, Crosshair, Bug, Skull, MapPin,
  Shield, Zap, ChevronDown, ChevronUp, X, Flame
} from 'lucide-react';

const ENEMY_OPTIONS = Object.keys(ENEMIES).map(id => ({
  id,
  name: ENEMIES[id].name,
  isBoss: ENEMIES[id].isBoss,
}));

const LOCATION_OPTIONS = Object.keys(LOCATIONS).map(id => ({
  id,
  name: LOCATIONS[id].name,
}));

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
    <Button
      size="sm"
      variant="outline"
      className={`w-full justify-start gap-2 text-[11px] font-medium h-8 ${colorClass}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

export default function DebugPanel() {
  const debugOpen = useGameStore(s => s.debugOpen);
  const godMode = useGameStore(s => s.godMode);
  const party = useGameStore(s => s.party);
  const phase = useGameStore(s => s.phase);

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
  } = useGameStore();

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
            <div className="grid grid-cols-2 gap-1">
              {ENEMY_OPTIONS.map(enemy => (
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
          </Section>

          {/* ── Teleport ── */}
          <Section title="Teletrasporto" icon={<MapPin className="w-3.5 h-3.5" />}>
            <div className="space-y-1">
              {LOCATION_OPTIONS.map(loc => (
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
              <div className="flex justify-between"><span>New Game+:</span><span className="text-white/70 font-mono">{useGameStore.getState().isNewGamePlus ? 'YES' : 'NO'}</span></div>
            </div>
          </Section>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
