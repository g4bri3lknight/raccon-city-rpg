'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { LOCATIONS } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home, LogOut, Package, Hammer, Wrench,
  Save, Upload
} from 'lucide-react';
import SaveLoadPanel from './SaveLoadPanel';
import ItemBoxPanel from './ItemBoxPanel';
import CraftingPanel from './CraftingPanel';
import EquipmentPanel from './EquipmentPanel';

type SafeRoomTab = 'itembox' | 'crafting' | 'equipment';
type SaveMode = 'save' | 'load';

export default function SafeRoomPanel() {
  const currentLocationId = useGameStore(s => s.currentLocationId);
  const exitSafeRoom = useGameStore(s => s.exitSafeRoom);
  const [activeTab, setActiveTab] = useState<SafeRoomTab>('itembox');
  const [saveModal, setSaveModal] = useState<SaveMode | null>(null);

  const location = LOCATIONS[currentLocationId];
  const safeRoomDef = location?.subAreas?.find(sa => sa.id === 'safe_room');

  const tabs: { id: SafeRoomTab; label: string; icon: React.ReactNode }[] = [
    { id: 'itembox', label: 'Item Box', icon: <Package className="w-5 h-5" /> },
    { id: 'crafting', label: 'Crafting', icon: <Hammer className="w-5 h-5" /> },
    { id: 'equipment', label: 'Equip', icon: <Wrench className="w-5 h-5" /> },
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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Home className="w-5 h-5 text-emerald-400" />
              <Badge className="border-emerald-500/30 text-emerald-400 text-sm bg-emerald-500/10 px-2.5 py-0.5">
                SAFE ROOM
              </Badge>
              <Badge variant="outline" className="border-white/[0.1] text-white/50 text-sm">
                {location?.name}
              </Badge>
              {/* Header buttons: Esci first, then Salva/Carica */}
              <div className="ml-auto flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exitSafeRoom}
                  className="text-sm border-red-500/20 hover:border-red-400/40 text-red-400/70 hover:text-red-300 bg-red-950/20 hover:bg-red-900/30 h-9 px-3"
                  title="Esci dalla Safe Room"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Esci</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSaveModal('save')}
                  className="text-sm border-white/10 hover:border-amber-500/30 text-white/50 hover:text-amber-400 bg-white/[0.03] hover:bg-amber-500/[0.06] h-9 px-3"
                  title="Salva partita"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Salva</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSaveModal('load')}
                  className="text-sm border-white/10 hover:border-cyan-500/30 text-white/50 hover:text-cyan-400 bg-white/[0.03] hover:bg-cyan-500/[0.06] h-9 px-3"
                  title="Carica partita"
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Carica</span>
                </Button>
              </div>
            </div>
            {safeRoomDef && (
              <p className="text-sm text-white/50 mt-1 max-w-lg">{safeRoomDef.description}</p>
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
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 ${
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

      {/* Content area — fills remaining space */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'itembox' && <ItemBoxPanel />}
        {activeTab === 'crafting' && (
          <div className="h-full overflow-y-auto p-4 inventory-scrollbar">
            <CraftingPanel />
          </div>
        )}
        {activeTab === 'equipment' && (
          <div className="h-full overflow-y-auto p-4 inventory-scrollbar">
            <EquipmentPanel />
          </div>
        )}
      </div>

      {/* Save/Load Modal */}
      {saveModal && (
        <SaveLoadPanel
          mode={saveModal}
          defaultOpen={saveModal}
          onClose={() => setSaveModal(null)}
        />
      )}
    </motion.div>
  );
}
