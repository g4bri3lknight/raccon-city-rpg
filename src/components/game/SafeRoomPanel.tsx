'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { LOCATIONS } from '@/game/data/locations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home, LogOut, Save, Package, Hammer,
  ChevronRight
} from 'lucide-react';
import SaveLoadPanel from './SaveLoadPanel';
import ItemBoxPanel from './ItemBoxPanel';
import CraftingPanel from './CraftingPanel';

type SafeRoomTab = 'save' | 'itembox' | 'crafting';

export default function SafeRoomPanel() {
  const currentLocationId = useGameStore(s => s.currentLocationId);
  const exitSafeRoom = useGameStore(s => s.exitSafeRoom);
  const [activeTab, setActiveTab] = useState<SafeRoomTab>('save');

  const location = LOCATIONS[currentLocationId];
  const safeRoomDef = location?.subAreas?.find(sa => sa.id === 'safe_room');

  const tabs: { id: SafeRoomTab; label: string; icon: React.ReactNode }[] = [
    { id: 'save', label: 'Salva', icon: <Save className="w-4 h-4" /> },
    { id: 'itembox', label: 'Item Box', icon: <Package className="w-4 h-4" /> },
    { id: 'crafting', label: 'Crafting', icon: <Hammer className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen game-horror flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="relative h-28 sm:h-36 shrink-0 overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-emerald-950/20 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)]" />

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Home className="w-4 h-4 text-emerald-400" />
              <Badge className="border-emerald-500/30 text-emerald-400 text-xs bg-emerald-500/10">
                SAFE ROOM
              </Badge>
              <Badge variant="outline" className="border-white/[0.1] text-white/50 text-xs">
                {location?.name}
              </Badge>
            </div>
            {safeRoomDef && (
              <p className="text-xs text-white/40 mt-1 max-w-lg">{safeRoomDef.description}</p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="shrink-0 px-3 pt-3 pb-0 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                  : 'border-transparent text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 inventory-scrollbar">
        {activeTab === 'save' && (
          <motion.div
            key="save"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <Save className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white/90">Salva Partita</h3>
            </div>
            <p className="text-xs text-white/40 mb-3">
              La Safe Room è il luogo ideale per salvare il tuo progresso. Usa la macchina da scrivere per registrare la tua avventura.
            </p>
            <SaveLoadPanel mode="both" />
          </motion.div>
        )}

        {activeTab === 'itembox' && (
          <motion.div
            key="itembox"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ItemBoxPanel />
          </motion.div>
        )}

        {activeTab === 'crafting' && (
          <motion.div
            key="crafting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CraftingPanel />
          </motion.div>
        )}
      </div>

      {/* Exit button */}
      <div className="shrink-0 p-3 border-t border-white/[0.06] bg-white/[0.02]">
        <Button
          onClick={exitSafeRoom}
          className="w-full h-11 text-sm font-bold bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Esci dalla Safe Room
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      </div>
    </motion.div>
  );
}
