'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { WEAPON_MODS } from '@/game/data/weapon-mods';
import { EQUIPMENT_STATS } from '@/game/data/equipment';
import { getCharacterAtk, getCharacterDef, getCharacterSpd, getCharacterMaxHp, getCharacterCritBonus } from '@/game/engine/combat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Wrench, Plus, Minus, Shield, Shirt, Ring, Swords, ChevronRight } from 'lucide-react';

export default function EquipmentPanel() {
  const party = useGameStore(s => s.party);
  const selectedCharacterId = useGameStore(s => s.selectedCharacterId);
  const selectCharacter = useGameStore(s => s.selectCharacter);
  const { equipArmor, unequipArmor, equipAccessory, unequipAccessory, installMod, removeMod } = useGameStore();
  const [activeTab, setActiveTab] = useState<'weapon' | 'armor' | 'accessory'>('weapon');

  const selectedChar = party.find(p => p.id === selectedCharacterId) || party[0];
  if (!selectedChar) return null;

  const rarityColors: Record<string, string> = {
    common: 'border-gray-400/30 text-gray-300',
    uncommon: 'border-cyan-400/30 text-cyan-300',
    rare: 'border-purple-400/30 text-purple-300',
    legendary: 'border-amber-400/30 text-amber-300',
  };

  const rarityBg: Record<string, string> = {
    common: 'bg-gray-500/10',
    uncommon: 'bg-cyan-500/10',
    rare: 'bg-purple-500/10',
    legendary: 'bg-amber-500/10',
  };

  // Get inventory items that are relevant to current tab
  const relevantItems = selectedChar.inventory.filter(i => {
    if (activeTab === 'weapon') return i.type === 'weapon_mod';
    if (activeTab === 'armor') return i.type === 'armor' && !i.isEquipped;
    if (activeTab === 'accessory') return i.type === 'accessory' && !i.isEquipped;
    return false;
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wrench className="w-5 h-5 text-amber-400" />
        <h3 className="text-base font-bold text-white/90">Equipaggiamento</h3>
      </div>

      {/* Character selector */}
      {party.length > 1 && (
        <div className="flex gap-1.5">
          {party.map(char => (
            <button
              key={char.id}
              onClick={() => selectCharacter(char.id)}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                char.id === selectedChar.id
                  ? 'bg-amber-900/40 text-amber-300 border border-amber-700/30'
                  : 'bg-white/[0.04] text-white/50 hover:text-white/70 border border-white/[0.06]'
              }`}
            >
              {char.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <StatBlock label="ATK" value={getCharacterAtk(selectedChar)} icon="⚔️" />
        <StatBlock label="DEF" value={getCharacterDef(selectedChar)} icon="🛡️" />
        <StatBlock label="SPD" value={getCharacterSpd(selectedChar)} icon="💨" />
        <StatBlock label="HP" value={getCharacterMaxHp(selectedChar)} icon="❤️" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        <TabButton
          icon={<Swords className="w-3.5 h-3.5" />}
          label="Arma"
          active={activeTab === 'weapon'}
          onClick={() => setActiveTab('weapon')}
        />
        <TabButton
          icon={<Shirt className="w-3.5 h-3.5" />}
          label="Armatura"
          active={activeTab === 'armor'}
          onClick={() => setActiveTab('armor')}
        />
        <TabButton
          icon={<Ring className="w-3.5 h-3.5" />}
          label="Accessorio"
          active={activeTab === 'accessory'}
          onClick={() => setActiveTab('accessory')}
        />
      </div>

      {/* Tab Content */}
      <div className="space-y-3 max-h-[55vh] overflow-y-auto inventory-scrollbar pr-1">
        <AnimatePresence mode="wait">
          {activeTab === 'weapon' && (
            <WeaponModSection
              key="weapon"
              character={selectedChar}
              relevantItems={relevantItems}
              installMod={installMod}
              removeMod={removeMod}
              rarityColors={rarityColors}
              rarityBg={rarityBg}
            />
          )}
          {activeTab === 'armor' && (
            <ArmorSection
              key="armor"
              character={selectedChar}
              relevantItems={relevantItems}
              equipArmor={equipArmor}
              unequipArmor={unequipArmor}
              rarityColors={rarityColors}
              rarityBg={rarityBg}
            />
          )}
          {activeTab === 'accessory' && (
            <AccessorySection
              key="accessory"
              character={selectedChar}
              relevantItems={relevantItems}
              equipAccessory={equipAccessory}
              unequipAccessory={unequipAccessory}
              rarityColors={rarityColors}
              rarityBg={rarityBg}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sub-components ──

function StatBlock({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="text-center">
      <div className="text-sm mb-0.5">{icon}</div>
      <div className="text-sm font-bold text-white/90">{value}</div>
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 ${
        active
          ? 'border-amber-500/60 text-amber-300 bg-amber-900/10'
          : 'border-transparent text-white/40 hover:text-white/60'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── #3 WEAPON MOD SECTION ──
function WeaponModSection({
  character,
  relevantItems,
  installMod,
  removeMod,
  rarityColors,
  rarityBg,
}: {
  character: any;
  relevantItems: any[];
  installMod: (charId: string, modUid: string) => void;
  removeMod: (charId: string, modIdx: number) => void;
  rarityColors: Record<string, string>;
  rarityBg: Record<string, string>;
}) {
  const weapon = character.weapon;
  if (!weapon) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="p-4 text-center text-white/40 text-sm border border-white/[0.06] rounded-lg bg-white/[0.02]"
      >
        Nessuna arma equipaggiata.
      </motion.div>
    );
  }

  const installedMods = weapon.modSlots.map((modId: string, idx: number) => WEAPON_MODS[modId]).filter(Boolean);
  const availableMods = relevantItems.filter(i => {
    if (!i.modStats) return false;
    const mod = i.modStats;
    if (mod.type !== 'any' && mod.type !== weapon.type) return false;
    if (weapon.modSlots.includes(mod.modId)) return false;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
    >
      {/* Current Weapon */}
      <div className={`p-3 rounded-lg border ${rarityColors[weapon.type === 'melee' ? 'common' : 'uncommon']} ${rarityBg['uncommon']}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white/90">
            {weapon.type === 'melee' ? '🗡️' : '🔫'} {weapon.name}
          </span>
          <Badge className="bg-white/10 text-white/50 border-0 text-[10px]">
            ATK +{weapon.atkBonus}
          </Badge>
        </div>

        {/* Mod Slots */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>Slot Mod ({weapon.modSlots.length}/2)</span>
          </div>
          {weapon.modSlots.length === 0 && (
            <div className="text-xs text-white/30 italic">Nessun mod installato</div>
          )}
          {installedMods.map((mod: any, idx: number) => (
            <div
              key={mod.modId}
              className={`flex items-center gap-2 p-2 rounded border ${rarityColors[mod.rarity]} ${rarityBg[mod.rarity]}`}
            >
              <span className="text-lg">{mod.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white/90 truncate">{mod.name}</div>
                <div className="text-[10px] text-white/50">
                  {mod.atkBonus ? `+${mod.atkBonus} ATK ` : ''}
                  {mod.critBonus ? `+${mod.critBonus}% Crit ` : ''}
                  {mod.statusBonus ? `+${mod.statusBonus}% Status ` : ''}
                  {mod.dodgeBonus ? `+${mod.dodgeBonus}% Dodge ` : ''}
                </div>
              </div>
              <button
                onClick={() => removeMod(character.id, idx)}
                className="p-1 rounded hover:bg-red-900/30 text-white/40 hover:text-red-400 transition-all"
                title="Rimuovi mod"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: 2 - weapon.modSlots.length }).map((_, i) => (
            <div
              key={`empty_${i}`}
              className="p-2 rounded border border-dashed border-white/[0.08] bg-white/[0.01] flex items-center justify-center text-white/20 text-xs"
            >
              Slot vuoto
            </div>
          ))}
        </div>
      </div>

      {/* Available Mods */}
      {availableMods.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">Mod disponibili</div>
          {availableMods.map(item => {
            const mod = item.modStats;
            return (
              <div
                key={item.uid}
                className={`p-2.5 rounded-lg border ${rarityColors[mod.rarity]} ${rarityBg[mod.rarity]} transition-all hover:brightness-110`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{mod.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white/90 truncate">{mod.name}</div>
                      <div className="text-[10px] text-white/50">
                        {mod.atkBonus ? `+${mod.atkBonus} ATK ` : ''}
                        {mod.critBonus ? `+${mod.critBonus}% Crit ` : ''}
                        {mod.statusBonus ? `+${mod.statusBonus}% Status ` : ''}
                        {mod.dodgeBonus ? `+${mod.dodgeBonus}% Dodge ` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => installMod(character.id, item.uid)}
                    className="px-2.5 py-1.5 rounded text-[10px] font-semibold bg-amber-900/40 text-amber-300 hover:bg-amber-800/50 border border-amber-700/30 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Installa
                  </button>
                </div>
                <p className="text-[10px] text-white/40 mt-1">{mod.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {availableMods.length === 0 && (
        <div className="text-xs text-white/30 text-center py-3 border border-dashed border-white/[0.06] rounded-lg">
          Nessun mod compatibile nell&apos;inventario.
        </div>
      )}
    </motion.div>
  );
}

// ── #29 ARMOR SECTION ──
function ArmorSection({
  character,
  relevantItems,
  equipArmor,
  unequipArmor,
  rarityColors,
  rarityBg,
}: {
  character: any;
  relevantItems: any[];
  equipArmor: (charId: string, itemUid: string) => void;
  unequipArmor: (charId: string) => void;
  rarityColors: Record<string, string>;
  rarityBg: Record<string, string>;
}) {
  const currentArmor = character.armor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
    >
      {/* Current Armor */}
      <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">Slot Armatura</div>
      {currentArmor ? (
        <EquippedCard
          equip={currentArmor}
          onUnequip={() => unequipArmor(character.id)}
          rarityColors={rarityColors}
          rarityBg={rarityBg}
        />
      ) : (
        <div className="p-3 rounded-lg border border-dashed border-white/[0.08] bg-white/[0.01] text-center text-white/30 text-xs">
          🦺 Nessuna armatura equipaggiata
        </div>
      )}

      {/* Available Armor */}
      {relevantItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">Armature disponibili</div>
          {relevantItems.map(item => {
            const eq = item.equipmentStats;
            if (!eq) return null;
            return (
              <div
                key={item.uid}
                className={`p-2.5 rounded-lg border ${rarityColors[eq.rarity]} ${rarityBg[eq.rarity]} transition-all hover:brightness-110`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{eq.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white/90 truncate">{eq.name}</div>
                      <div className="text-[10px] text-white/50">
                        {eq.defBonus ? `+${eq.defBonus} DEF ` : ''}
                        {eq.hpBonus ? `+${eq.hpBonus} HP ` : ''}
                        {eq.spdBonus ? `+${eq.spdBonus} SPD ` : ''}
                        {eq.atkBonus ? `+${eq.atkBonus} ATK ` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => equipArmor(character.id, item.uid)}
                    className="px-2.5 py-1.5 rounded text-[10px] font-semibold bg-amber-900/40 text-amber-300 hover:bg-amber-800/50 border border-amber-700/30 transition-all flex items-center gap-1"
                  >
                    <Shield className="w-3 h-3" />
                    Equipaggia
                  </button>
                </div>
                {eq.specialEffect && (
                  <div className="text-[10px] text-purple-300/70 mt-1">
                    ✨ {formatSpecialEffect(eq.specialEffect.type, eq.specialEffect.value)}
                  </div>
                )}
                <p className="text-[10px] text-white/40 mt-1">{eq.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {relevantItems.length === 0 && (
        <div className="text-xs text-white/30 text-center py-3 border border-dashed border-white/[0.06] rounded-lg">
          Nessuna armatura nell&apos;inventario.
        </div>
      )}
    </motion.div>
  );
}

// ── #29 ACCESSORY SECTION ──
function AccessorySection({
  character,
  relevantItems,
  equipAccessory,
  unequipAccessory,
  rarityColors,
  rarityBg,
}: {
  character: any;
  relevantItems: any[];
  equipAccessory: (charId: string, itemUid: string) => void;
  unequipAccessory: (charId: string) => void;
  rarityColors: Record<string, string>;
  rarityBg: Record<string, string>;
}) {
  const currentAccessory = character.accessory;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
    >
      {/* Current Accessory */}
      <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">Slot Accessorio</div>
      {currentAccessory ? (
        <EquippedCard
          equip={currentAccessory}
          onUnequip={() => unequipAccessory(character.id)}
          rarityColors={rarityColors}
          rarityBg={rarityBg}
        />
      ) : (
        <div className="p-3 rounded-lg border border-dashed border-white/[0.08] bg-white/[0.01] text-center text-white/30 text-xs">
          📿 Nessun accessorio equipaggiato
        </div>
      )}

      {/* Available Accessories */}
      {relevantItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">Accessori disponibili</div>
          {relevantItems.map(item => {
            const eq = item.equipmentStats;
            if (!eq) return null;
            return (
              <div
                key={item.uid}
                className={`p-2.5 rounded-lg border ${rarityColors[eq.rarity]} ${rarityBg[eq.rarity]} transition-all hover:brightness-110`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{eq.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white/90 truncate">{eq.name}</div>
                      <div className="text-[10px] text-white/50">
                        {eq.defBonus ? `+${eq.defBonus} DEF ` : ''}
                        {eq.hpBonus ? `+${eq.hpBonus} HP ` : ''}
                        {eq.spdBonus ? `+${eq.spdBonus} SPD ` : ''}
                        {eq.atkBonus ? `+${eq.atkBonus} ATK ` : ''}
                        {eq.critBonus ? `+${eq.critBonus}% Crit ` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => equipAccessory(character.id, item.uid)}
                    className="px-2.5 py-1.5 rounded text-[10px] font-semibold bg-amber-900/40 text-amber-300 hover:bg-amber-800/50 border border-amber-700/30 transition-all flex items-center gap-1"
                  >
                    <ChevronRight className="w-3 h-3" />
                    Equipaggia
                  </button>
                </div>
                {eq.specialEffect && (
                  <div className="text-[10px] text-purple-300/70 mt-1">
                    ✨ {formatSpecialEffect(eq.specialEffect.type, eq.specialEffect.value)}
                  </div>
                )}
                <p className="text-[10px] text-white/40 mt-1">{eq.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {relevantItems.length === 0 && (
        <div className="text-xs text-white/30 text-center py-3 border border-dashed border-white/[0.06] rounded-lg">
          Nessun accessorio nell&apos;inventario.
        </div>
      )}
    </motion.div>
  );
}

// ── Shared: Equipped Card ──
function EquippedCard({
  equip,
  onUnequip,
  rarityColors,
  rarityBg,
}: {
  equip: any;
  onUnequip: () => void;
  rarityColors: Record<string, string>;
  rarityBg: Record<string, string>;
}) {
  return (
    <div className={`p-3 rounded-lg border ${rarityColors[equip.rarity]} ${rarityBg[equip.rarity]}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center text-2xl shrink-0">
          {equip.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white/90 truncate">{equip.name}</div>
          <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-white/50">
            {equip.defBonus && <span>🛡️ +{equip.defBonus} DEF</span>}
            {equip.hpBonus && <span>❤️ +{equip.hpBonus} HP</span>}
            {equip.spdBonus && <span>💨 +{equip.spdBonus} SPD</span>}
            {equip.atkBonus && <span>⚔️ +{equip.atkBonus} ATK</span>}
            {equip.critBonus && <span>💥 +{equip.critBonus}% Crit</span>}
          </div>
          {equip.specialEffect && (
            <div className="text-[10px] text-purple-300/70 mt-1">
              ✨ {formatSpecialEffect(equip.specialEffect.type, equip.specialEffect.value)}
            </div>
          )}
        </div>
        <button
          onClick={onUnequip}
          className="p-1.5 rounded hover:bg-red-900/30 text-white/40 hover:text-red-400 transition-all"
          title="Rimuovi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──
function formatSpecialEffect(type: string, value: number): string {
  const labels: Record<string, string> = {
    poison_resist: `${value}% resistenza veleno`,
    bleed_resist: `${value}% resistenza sanguinamento`,
    stun_resist: `${value}% resistenza stordimento`,
    hp_regen: `Rigenera ${value} HP/turno`,
    thorns: `Riflette ${value} danni`,
    crit_shield: `${value}% riduzione critici subiti`,
  };
  return labels[type] || type;
}
