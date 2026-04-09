'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  ImageIcon,
  Swords,
  Zap,
  ChevronLeft,
  ChevronRight,
  Camera,
  Plus,
  Minus,
  Shield,
  Heart,
  Wind,
  Crosshair,
  Flame,
  Star,
  Sparkles,
  Check,
} from 'lucide-react';
import { PREDEFINED_AVATARS, CUSTOM_STAT_BUDGET } from '@/game/data/specials';
import { ALL_SPECIAL_ABILITIES, SPECIALS_DATA, CHARACTER_ARCHETYPES, ARCHETYPE_STAT_POINTS, getCustomPassiveDescription, ARCHETYPE_SPECIAL_MAP, ARCHETYPE_CATEGORY_MAP } from '@/game/data/loader';
import type { CustomCharacterConfig, Archetype, SpecialCategory } from '@/game/types';

// ==========================================
// Types & Constants
// ==========================================

interface CharacterCreatorProps {
  onComplete: (config: CustomCharacterConfig) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, label: 'Info Base', shortLabel: '1', icon: User },
  { id: 2, label: 'Avatar', shortLabel: '2', icon: ImageIcon },
  { id: 3, label: 'Archetipo', shortLabel: '3', icon: Swords },
  { id: 4, label: 'Abilità', shortLabel: '4', icon: Zap },
] as const;

const STAT_DEFINITIONS = [
  { key: 'hp' as const, label: 'Vitalità', icon: Heart, color: '#ef4444', description: 'Punti Vita massimi' },
  { key: 'atk' as const, label: 'Forza', icon: Crosshair, color: '#f97316', description: 'Danno degli attacchi' },
  { key: 'def' as const, label: 'Resistenza', icon: Shield, color: '#3b82f6', description: 'Riduzione danni' },
  { key: 'spd' as const, label: 'Velocità', icon: Wind, color: '#22c55e', description: 'Iniziativa in combattimento' },
];

const CATEGORY_LABELS: Record<SpecialCategory, string> = {
  offensive: '⚔️ Offensivo',
  defensive: '🛡️ Difensivo',
  support: '💚 Supporto',
  control: '🎯 Controllo',
};

const CATEGORY_SHORT_LABELS: Record<SpecialCategory, string> = {
  offensive: 'Off.',
  defensive: 'Dif.',
  support: 'Sup.',
  control: 'Ctrl.',
};

const CATEGORY_COLORS: Record<SpecialCategory, string> = {
  offensive: 'bg-red-900/50 text-red-300 border-red-700/50',
  defensive: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  support: 'bg-green-900/50 text-green-300 border-green-700/50',
  control: 'bg-purple-900/50 text-purple-300 border-purple-700/50',
};

const ARCHETYPE_ICONS: Record<string, string> = {
  tank: '🛡️',
  healer: '💊',
  dps: '⚔️',
  control: '🎯',
  custom: '🔧',
};

// ==========================================
// Animation Variants
// ==========================================

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ==========================================
// Component
// ==========================================

export default function CharacterCreator({ onComplete, onCancel }: CharacterCreatorProps) {
  // ── Wizard state ──
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isCompleting, setIsCompleting] = useState(false);

  // ── Step 1: Basic Info ──
  const [name, setName] = useState('');
  const [biography, setBiography] = useState('');

  // ── Step 2: Avatar ──
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [customAvatarDataUrl, setCustomAvatarDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 3: Archetype & Stats ──
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [customStats, setCustomStats] = useState({
    hp: CUSTOM_STAT_BUDGET.defaults.hp,
    atk: CUSTOM_STAT_BUDGET.defaults.atk,
    def: CUSTOM_STAT_BUDGET.defaults.def,
    spd: CUSTOM_STAT_BUDGET.defaults.spd,
  });

  // ── Step 4: Abilities ──
  const [selectedAbilities, setSelectedAbilities] = useState<string[]>([]);
  const [abilityFilter, setAbilityFilter] = useState<SpecialCategory | 'all'>('all');

  // ── Validation ──
  const nameError = useMemo(() => {
    if (name.length === 0) return 'Il nome è obbligatorio';
    if (name.length < 2) return 'Minimo 2 caratteri';
    return null;
  }, [name]);

  const step1Valid = name.trim().length >= 2;
  const step2Valid = selectedAvatarId !== null || customAvatarDataUrl !== null;
  const step3Valid = selectedArchetype !== null;
  const step4Valid = selectedAbilities.length === 2;

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 1: return step1Valid;
      case 2: return step2Valid;
      case 3: return step3Valid;
      case 4: return step4Valid;
      default: return false;
    }
  }, [currentStep, step1Valid, step2Valid, step3Valid, step4Valid]);

  // ── Derived stats for preview ──
  const derivedStats = useMemo(() => {
    if (selectedArchetype === 'custom' || !selectedArchetype) {
      return {
        maxHp: customStats.hp * 10,
        atk: customStats.atk,
        def: customStats.def,
        spd: customStats.spd,
      };
    }
    // Preset archetype: use point-based system (same as custom)
    const points = ARCHETYPE_STAT_POINTS[selectedArchetype];
    if (points) {
      return { maxHp: points.hp * 10, atk: points.atk, def: points.def, spd: points.spd };
    }
    const arch = CHARACTER_ARCHETYPES.find(a => a.id === selectedArchetype);
    if (arch) {
      return { maxHp: arch.maxHp, atk: arch.atk, def: arch.def, spd: arch.spd };
    }
    return { maxHp: 0, atk: 0, def: 0, spd: 0 };
  }, [selectedArchetype, customStats]);

  const remainingPoints = useMemo(() => {
    return CUSTOM_STAT_BUDGET.totalPoints - (customStats.hp + customStats.atk + customStats.def + customStats.spd);
  }, [customStats]);

  // ── Avatar handling ──
  const avatarUrl = useMemo(() => {
    if (customAvatarDataUrl) return customAvatarDataUrl;
    if (selectedAvatarId) {
      const avatar = PREDEFINED_AVATARS.find(a => a.id === selectedAvatarId);
      return avatar?.path || '';
    }
    return '';
  }, [selectedAvatarId, customAvatarDataUrl]);

  const isCustomAvatar = customAvatarDataUrl !== null;

  // ── Navigation ──
  const goToStep = useCallback((step: number) => {
    // Can only go to: already completed steps, current step, or next step if current is valid
    const stepValidations = [false, step1Valid, step2Valid, step3Valid, step4Valid];
    const isAccessible = step < currentStep // go back to completed
      || step === currentStep // stay on current
      || (step === currentStep + 1 && stepValidations[currentStep]); // next step only if current valid

    if (!isAccessible) return;

    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }, [currentStep, step1Valid, step2Valid, step3Valid, step4Valid]);

  const goNext = useCallback(() => {
    if (currentStep < 4 && canGoNext) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, canGoNext]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Reset stats to archetype defaults when base archetype changes
  const handleArchetypeChange = useCallback((archetype: Archetype | null) => {
    setSelectedArchetype(archetype);
    if (archetype && archetype !== 'custom') {
      const points = ARCHETYPE_STAT_POINTS[archetype as keyof typeof ARCHETYPE_STAT_POINTS];
      if (points) {
        setCustomStats({ hp: points.hp, atk: points.atk, def: points.def, spd: points.spd });
      }
    } else if (archetype === 'custom') {
      setCustomStats({ hp: CUSTOM_STAT_BUDGET.defaults.hp, atk: CUSTOM_STAT_BUDGET.defaults.atk, def: CUSTOM_STAT_BUDGET.defaults.def, spd: CUSTOM_STAT_BUDGET.defaults.spd });
    }
    setSelectedAbilities([]);
    setAbilityFilter('all');
  }, []);

  // ── File upload handler ──
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) return; // 2MB limit

    const reader = new FileReader();
    reader.onload = () => {
      setCustomAvatarDataUrl(reader.result as string);
      setSelectedAvatarId(null);
    };
    reader.readAsDataURL(file);

    // Reset the input so the same file can be selected again
    e.target.value = '';
  }, []);

  // ── Stat allocation handler ──
  const adjustStat = useCallback((key: 'hp' | 'atk' | 'def' | 'spd', delta: number) => {
    setCustomStats(prev => {
      const newVal = prev[key] + delta;
      if (newVal < CUSTOM_STAT_BUDGET.minPerStat) return prev;
      if (newVal > CUSTOM_STAT_BUDGET.maxPerStat) return prev;
      const totalAfter = Object.entries(prev).reduce((sum, [k, v]) => sum + (k === key ? newVal : v), 0);
      if (totalAfter > CUSTOM_STAT_BUDGET.totalPoints) return prev;
      return { ...prev, [key]: newVal };
    });
  }, []);

  // ── Ability selection handler ──
  const toggleAbility = useCallback((abilityId: string) => {
    setSelectedAbilities(prev => {
      if (prev.includes(abilityId)) {
        return prev.filter(id => id !== abilityId);
      }
      if (prev.length >= 2) return prev;
      return [...prev, abilityId];
    });
  }, []);



  const isPresetArchetype = selectedArchetype !== null && selectedArchetype !== 'custom';

  // ── Completion handler ──
  const handleComplete = useCallback(() => {
    if (!step1Valid || !step2Valid || !step3Valid || !step4Valid) return;

    setIsCompleting(true);

    const passive = selectedArchetype === 'custom'
      ? getCustomPassiveDescription(customStats)
      : CHARACTER_ARCHETYPES.find(a => a.id === selectedArchetype)?.passiveDescription || '';

    const config: CustomCharacterConfig = {
      name: name.trim(),
      biography: biography.trim(),
      avatarUrl,
      isCustomAvatar,
      baseArchetype: selectedArchetype || 'custom',
      customStats: { ...customStats },
      special1Id: selectedAbilities[0],
      special2Id: selectedAbilities[1],
      passiveDescription: passive,
    };

    // Short delay for success animation
    setTimeout(() => {
      onComplete(config);
    }, 600);
  }, [step1Valid, step2Valid, step3Valid, step4Valid, name, biography, avatarUrl, isCustomAvatar, selectedArchetype, customStats, selectedAbilities, onComplete]);

  // ── Filtered abilities ──
  // Preset: show the 5 specials of the archetype's category. Custom: show all with optional filter.
  const filteredAbilities = useMemo(() => {
    // Use SPECIALS_DATA from loader when available, fallback to static
    const pool = SPECIALS_DATA.length > 0 ? SPECIALS_DATA : ALL_SPECIAL_ABILITIES;
    if (isPresetArchetype && selectedArchetype) {
      const category = ARCHETYPE_CATEGORY_MAP[selectedArchetype];
      if (category) {
        return pool.filter(a => a.category === category);
      }
    }
    // Custom archetype: show all with optional category filter
    if (abilityFilter === 'all') return pool;
    return pool.filter(a => a.category === abilityFilter);
  }, [abilityFilter, selectedArchetype, isPresetArchetype]);

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="game-horror fixed inset-0 z-50 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      {/* Scanline overlay */}
      <div className="scanline-overlay pointer-events-none fixed inset-0 z-10" />

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />

      {/* Ambient red glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-20 flex flex-col h-full max-w-4xl w-full mx-auto px-3 py-4 sm:px-6 sm:py-6">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-6"
        >
          <h1 className="horror-text text-xl sm:text-3xl font-bold tracking-wider text-red-400 mb-1">
            CREA IL TUO PERSONAGGIO
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-mono hidden sm:block">
            Resident Evil: Raccoon City Escape — Editor Personaggio
          </p>
        </motion.div>

        {/* ── Avatar Preview (visible from step 2+) ── */}
        {avatarUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 mb-3 sm:mb-4 px-2"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 border-red-600/50 shadow-[0_0_12px_rgba(220,38,38,0.2)] shrink-0">
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-200 truncate">{name.trim() || 'Nome Sconosciuto'}</p>
              {biography.trim() && (
                <p className="text-[10px] text-zinc-500 font-mono truncate hidden sm:block">{biography.trim()}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Step Indicator ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-1 sm:gap-3 mb-4 sm:mb-6 select-none"
        >
          {STEPS.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isLocked = step.id > currentStep + 1 || (step.id === currentStep + 1 && !canGoNext);
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-1 sm:gap-3">
                {idx > 0 && (
                  <div
                    className={`h-px w-3 sm:w-8 transition-colors duration-500 ${
                      currentStep >= step.id ? 'bg-red-600' : 'bg-zinc-800'
                    }`}
                  />
                )}
                <button
                  onClick={() => goToStep(step.id)}
                  disabled={isLocked}
                  className={`flex flex-col items-center gap-0.5 sm:gap-0 px-1.5 sm:px-3 py-1 sm:py-2 rounded-lg transition-all duration-300 min-h-[44px] justify-center ${
                    isLocked
                      ? 'opacity-40 cursor-not-allowed text-zinc-700'
                      : isCurrent
                        ? 'glass-dark-accent text-red-400 scale-105 cursor-pointer'
                        : isCompleted
                          ? 'text-red-500/70 hover:text-red-400 cursor-pointer'
                          : 'text-zinc-600 hover:text-zinc-400 cursor-pointer'
                  }`}
                >
                  <div
                    className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isLocked
                        ? 'bg-zinc-900/40 text-zinc-700 border border-zinc-800/40'
                        : isCurrent
                          ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.5)]'
                          : isCompleted
                            ? 'bg-red-900/50 text-red-400 border border-red-700/40'
                            : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
                    ) : (
                      <Icon className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
                    )}
                  </div>
                  <span className="sm:hidden text-[9px] text-zinc-500 font-mono">{step.shortLabel}</span>
                  <span className="hidden sm:inline text-xs font-mono">{step.label}</span>
                </button>
              </div>
            );
          })}
        </motion.div>

        {/* ── Content Area ── */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="popLayout" custom={direction}>
            {/* ═══════════════════════════════════════════
                STEP 1: INFO BASE
                ═══════════════════════════════════════════ */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="absolute inset-0 flex flex-col"
              >
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="glass-dark rounded-xl p-4 sm:p-6 flex-1 flex flex-col gap-5 overflow-y-auto overscroll-contain glass-scrollbar"
                >
                  <motion.div variants={staggerItem}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-red-400" />
                      </div>
                      <h2 className="text-lg font-bold text-zinc-100">Informazioni Base</h2>
                    </div>
                    <p className="text-zinc-500 text-xs mb-5 font-mono leading-relaxed">
                      Inserisci i dati identificativi del tuo sopravvissuto. Il nome sarà visibile durante tutto il gioco.
                    </p>
                  </motion.div>

                  {/* Name Input */}
                  <motion.div variants={staggerItem} className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      Nome del Sopravvissuto
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 30))}
                      placeholder="Es. Leon Kennedy..."
                      className="glass-dark-inner bg-transparent text-zinc-100 placeholder:text-zinc-600 border-red-900/30 focus:border-red-600/50 focus:ring-red-600/20 h-11 font-mono text-sm"
                      maxLength={30}
                      inputMode="text"
                      autoComplete="off"
                    />
                    <div className="flex items-center justify-between">
                      {nameError && name.length > 0 ? (
                        <p className="text-red-500 text-xs">{nameError}</p>
                      ) : (
                        <p className="text-zinc-600 text-xs">Minimo 2 caratteri, massimo 30</p>
                      )}
                      <span className={`text-xs font-mono ${name.length > 30 ? 'text-red-500' : 'text-zinc-600'}`}>
                        {name.length}/30
                      </span>
                    </div>
                  </motion.div>

                  {/* Biography Textarea */}
                  <motion.div variants={staggerItem} className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      Biografia
                      <span className="text-zinc-600 text-xs">(opzionale)</span>
                    </label>
                    <Textarea
                      value={biography}
                      onChange={(e) => setBiography(e.target.value.slice(0, 200))}
                      placeholder="Racconta la storia del tuo sopravvissuto... Cosa lo ha portato a Raccoon City?"
                      className="glass-dark-inner bg-transparent text-zinc-100 placeholder:text-zinc-600 border-red-900/30 focus:border-red-600/50 focus:ring-red-600/20 min-h-[100px] resize-none font-mono text-sm"
                      maxLength={200}
                      autoComplete="off"
                    />
                    <div className="flex justify-end">
                      <span className={`text-xs font-mono ${biography.length > 200 ? 'text-red-500' : 'text-zinc-600'}`}>
                        {biography.length}/200
                      </span>
                    </div>
                  </motion.div>


                </motion.div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                STEP 2: AVATAR
                ═══════════════════════════════════════════ */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="absolute inset-0 flex flex-col"
              >
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="glass-dark rounded-xl p-4 sm:p-6 flex-1 flex flex-col gap-4 overflow-y-auto overscroll-contain glass-scrollbar"
                >
                  <motion.div variants={staggerItem}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-red-400" />
                      </div>
                      <h2 className="text-lg font-bold text-zinc-100">Avatar</h2>
                    </div>
                    <p className="text-zinc-500 text-xs font-mono">
                      Scegli un volto per il tuo sopravvissuto o carica un&apos;immagine personalizzata.
                    </p>
                  </motion.div>

                  {/* Predefined Avatars Grid */}
                  <motion.div variants={staggerItem}>
                    <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
                      Avatar Predefiniti
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
                      {PREDEFINED_AVATARS.map((avatar, idx) => {
                        const isSelected = selectedAvatarId === avatar.id && !customAvatarDataUrl;
                        return (
                          <motion.button
                            key={avatar.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSelectedAvatarId(avatar.id);
                              setCustomAvatarDataUrl(null);
                            }}
                            className={`relative group rounded-xl overflow-hidden cursor-pointer transition-all duration-300 active:scale-95 min-h-[44px] border-2 ${
                              isSelected
                                ? 'border-red-500 bg-red-500/5 shadow-[0_0_20px_rgba(220,38,38,0.3)] scale-[1.02]'
                                : 'border-zinc-800 hover:border-zinc-600'
                            }`}
                          >
                            <div className="aspect-square bg-zinc-900/80 relative overflow-hidden">
                              <img
                                src={avatar.path}
                                alt={avatar.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 pointer-events-none"
                                style={{ imageRendering: 'auto' }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                              {/* Check mark */}
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shadow-lg"
                                >
                                  <Check className="w-3 h-3 text-white" />
                                </motion.div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Custom Upload */}
                  <motion.div variants={staggerItem}>
                    <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
                      Immagine Personalizzata
                    </h3>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {customAvatarDataUrl ? (
                      <div className="relative group">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                          <img
                            src={customAvatarDataUrl}
                            alt="Avatar personalizzato"
                            className="w-full h-full object-cover pointer-events-none"
                          />
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shadow-lg"
                          >
                            <Check className="w-3 h-3 text-white" />
                          </motion.div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomAvatarDataUrl(null);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-600 hover:bg-red-900/50 hover:border-red-600 p-0"
                        >
                          <span className="text-xs text-zinc-400">✕</span>
                        </Button>
                        <p className="text-xs text-green-400 mt-2 font-mono">✓ Immagine caricata</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg glass-dark-inner hover:bg-white/5 transition-all duration-300 cursor-pointer group min-h-[44px] active:scale-[0.98]"
                      >
                        <div className="w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center border border-dashed border-zinc-600 group-hover:border-red-600/50 transition-colors">
                          <Camera className="w-5 h-5 text-zinc-500 group-hover:text-red-400 transition-colors" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
                            Carica immagine
                          </p>
                          <p className="text-xs text-zinc-600">JPG, PNG — Max 2MB</p>
                        </div>
                      </button>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                STEP 3: ARCHETYPE & STATS
                ═══════════════════════════════════════════ */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="absolute inset-0 flex flex-col"
              >
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="glass-dark rounded-xl p-4 sm:p-6 flex-1 flex flex-col gap-4 overflow-y-auto overscroll-contain glass-scrollbar"
                >
                  <motion.div variants={staggerItem}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
                        <Swords className="w-4 h-4 text-red-400" />
                      </div>
                      <h2 className="text-lg font-bold text-zinc-100">Archetipo e Statistiche</h2>
                    </div>
                    <p className="text-zinc-500 text-xs font-mono">
                      Scegli un archetipo predefinito o crea una build personalizzata.
                    </p>
                  </motion.div>

                  {/* Archetype Selection */}
                  <motion.div variants={staggerItem}>
                    <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
                      Seleziona Archetipo
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {CHARACTER_ARCHETYPES.map((arch) => {
                        const isSelected = selectedArchetype === arch.id;
                        return (
                          <motion.button
                            key={arch.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleArchetypeChange(arch.id)}
                            className={`relative text-left p-3 sm:p-4 rounded-xl transition-all duration-300 cursor-pointer min-h-[44px] select-none ${
                              isSelected
                                ? 'glass-dark-accent ring-1 ring-red-600/50 shadow-[0_0_20px_rgba(220,38,38,0.15)]'
                                : 'glass-dark-inner hover:bg-white/5 ring-1 ring-zinc-800/50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="text-2xl sm:text-3xl mt-0.5">
                                {ARCHETYPE_ICONS[arch.id] || '❓'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-zinc-200">{arch.name}</h4>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center"
                                    >
                                      <Check className="w-2.5 h-2.5 text-white" />
                                    </motion.div>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-500 font-mono mt-1 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                                  {arch.description}
                                </p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}

                      {/* Custom Archetype Option */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleArchetypeChange('custom')}
                        className={`relative text-left p-3 sm:p-4 rounded-xl transition-all duration-300 cursor-pointer min-h-[44px] select-none ${
                          selectedArchetype === 'custom'
                            ? 'glass-dark-accent ring-1 ring-red-600/50 shadow-[0_0_20px_rgba(220,38,38,0.15)]'
                            : 'glass-dark-inner hover:bg-white/5 ring-1 ring-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl sm:text-3xl mt-0.5">🔧</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-zinc-200">Personale</h4>
                              {selectedArchetype === 'custom' && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center"
                                >
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </motion.div>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 font-mono mt-1 leading-relaxed line-clamp-1 sm:line-clamp-2">
                              Distribuisci i punti statistiche come preferisci per creare il tuo sopravvissuto unico.
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Predefined Archetype Info */}
                  <AnimatePresence>
                    {selectedArchetype && selectedArchetype !== 'custom' && (
                      <motion.div
                        key="arch-info"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {(() => {
                          const arch = CHARACTER_ARCHETYPES.find(a => a.id === selectedArchetype);
                          if (!arch) return null;
                          return (
                            <Card className="glass-dark-inner border-red-900/20 p-3 sm:p-4 overflow-hidden">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">{ARCHETYPE_ICONS[arch.id]}</span>
                                <h4 className="text-sm font-bold text-zinc-200">{arch.name}</h4>
                              </div>
                              <p className="text-xs text-zinc-400 font-mono mb-3 leading-relaxed">
                                {arch.passiveDescription}
                              </p>
                              <div className="grid grid-cols-4 gap-2">
                                <StatMiniBar label="HP" value={arch.maxHp} color="#ef4444" />
                                <StatMiniBar label="ATK" value={arch.atk} color="#f97316" />
                                <StatMiniBar label="DEF" value={arch.def} color="#3b82f6" />
                                <StatMiniBar label="SPD" value={arch.spd} color="#22c55e" />
                              </div>
                            </Card>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Custom Stat Allocation */}
                  <AnimatePresence>
                    {selectedArchetype === 'custom' && (
                      <motion.div
                        key="custom-stats"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="glass-dark-inner border-red-900/20 p-3 sm:p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-red-400" />
                              Distribuzione Punti
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-xs font-mono ${
                                remainingPoints === 0
                                  ? 'border-green-700/50 text-green-400 bg-green-900/20'
                                  : remainingPoints < 5
                                    ? 'border-yellow-700/50 text-yellow-400 bg-yellow-900/20'
                                    : 'border-zinc-700/50 text-zinc-400 bg-zinc-800/50'
                              }`}
                            >
                              {remainingPoints} punti rimanenti
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            {STAT_DEFINITIONS.map((stat) => {
                              const val = customStats[stat.key];
                              const Icon = stat.icon;
                              const isMaxed = val >= CUSTOM_STAT_BUDGET.maxPerStat;
                              const isMin = val <= CUSTOM_STAT_BUDGET.minPerStat;
                              return (
                                <div key={stat.key} className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                                      <span className="text-xs font-medium text-zinc-300">{stat.label}</span>
                                    </div>
                                    <span className="text-sm font-bold font-mono" style={{ color: stat.color }}>
                                      {val}
                                    </span>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full transition-all duration-200"
                                      style={{
                                        width: `${(val / CUSTOM_STAT_BUDGET.maxPerStat) * 100}%`,
                                        backgroundColor: stat.color,
                                        opacity: 0.8,
                                      }}
                                    />
                                  </div>

                                  {/* +/- buttons */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => adjustStat(stat.key, -1)}
                                      disabled={isMin}
                                      className={`w-9 h-9 rounded-md flex items-center justify-center transition-all duration-200 active:scale-90 ${
                                        isMin
                                          ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                                          : 'glass-btn hover:bg-red-900/30 text-zinc-400 hover:text-red-400 cursor-pointer'
                                      }`}
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>

                                    <div className="flex-1" />

                                    <button
                                      onClick={() => adjustStat(stat.key, 1)}
                                      disabled={isMaxed || remainingPoints <= 0}
                                      className={`w-9 h-9 rounded-md flex items-center justify-center transition-all duration-200 active:scale-90 ${
                                        isMaxed || remainingPoints <= 0
                                          ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                                          : 'glass-btn hover:bg-red-900/30 text-zinc-400 hover:text-red-400 cursor-pointer'
                                      }`}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Derived stats preview */}
                          <div className="mt-4 pt-3 border-t border-zinc-800/60">
                            <p className="text-xs text-zinc-500 font-mono mb-2">Anteprima statistiche derivate:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="text-center p-2 rounded-lg bg-zinc-900/40">
                                <p className="text-[10px] text-zinc-500 uppercase">HP</p>
                                <p className="text-sm font-bold text-red-400 font-mono">{derivedStats.maxHp}</p>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-zinc-900/40">
                                <p className="text-[10px] text-zinc-500 uppercase">ATK</p>
                                <p className="text-sm font-bold text-orange-400 font-mono">{derivedStats.atk}</p>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-zinc-900/40">
                                <p className="text-[10px] text-zinc-500 uppercase">DEF</p>
                                <p className="text-sm font-bold text-blue-400 font-mono">{derivedStats.def}</p>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-zinc-900/40">
                                <p className="text-[10px] text-zinc-500 uppercase">SPD</p>
                                <p className="text-sm font-bold text-green-400 font-mono">{derivedStats.spd}</p>
                              </div>
                            </div>
                          </div>

                          {/* Passive preview */}
                          <div className="mt-3 p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/40">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <p className="text-[10px] text-zinc-500 uppercase font-medium">Passiva</p>
                            </div>
                            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                              {getCustomPassiveDescription(customStats)}
                            </p>
                          </div>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                STEP 4: SPECIAL ABILITIES
                ═══════════════════════════════════════════ */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="absolute inset-0 flex flex-col"
              >
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="glass-dark rounded-xl p-4 sm:p-6 flex-1 flex flex-col gap-3 overflow-y-auto overscroll-contain glass-scrollbar"
                >
                  <motion.div variants={staggerItem}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-red-400" />
                      </div>
                      <h2 className="text-lg font-bold text-zinc-100">Abilità Speciali</h2>
                    </div>
                    <p className="text-zinc-500 text-xs font-mono">
                      {isPresetArchetype
                        ? 'Le abilità speciali dell\'archetipo sono predefinite.'
                        : 'Seleziona esattamente 2 abilità speciali per il tuo sopravvissuto.'}
                    </p>
                  </motion.div>

                  {/* Selection counter */}
                  <motion.div variants={staggerItem} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs font-mono ${
                          selectedAbilities.length === 2
                            ? 'border-green-700/50 text-green-400 bg-green-900/20'
                            : 'border-zinc-700/50 text-zinc-400 bg-zinc-800/50'
                        }`}
                      >
                        {`${selectedAbilities.length}/2 selezionate`}
                      </Badge>
                    </div>

                    {/* Category filters — only for custom archetype */}
                    {!isPresetArchetype && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {(['all', 'offensive', 'defensive', 'support', 'control'] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setAbilityFilter(cat)}
                          className={`px-2 py-1.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-mono transition-all duration-200 cursor-pointer min-h-[36px] sm:min-h-0 ${
                            abilityFilter === cat
                              ? 'bg-red-900/40 text-red-400 border border-red-700/40'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border border-transparent'
                          }`}
                        >
                          {cat === 'all' ? 'Tutte' : CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                    )}
                  </motion.div>

                  {/* Abilities grid */}
                  <motion.div
                    variants={staggerItem}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                  >
                    {filteredAbilities.map((ability) => {
                      const isSelected = selectedAbilities.includes(ability.id);
                      const isFull = selectedAbilities.length >= 2 && !isSelected;
                      return (
                        <motion.button
                          key={ability.id}
                          whileHover={!isFull ? { scale: 1.02 } : undefined}
                          whileTap={!isFull ? { scale: 0.98 } : undefined}
                          onClick={() => !isFull && toggleAbility(ability.id)}
                          disabled={isFull}
                          className={`relative text-left p-3 sm:p-4 rounded-xl transition-all duration-300 cursor-pointer min-h-[44px] select-none ${
                            isSelected
                              ? 'glass-dark-accent ring-1 ring-red-600/50 shadow-[0_0_20px_rgba(220,38,38,0.15)]'
                              : isFull
                                ? 'glass-dark-inner opacity-40 cursor-not-allowed'
                                : 'glass-dark-inner hover:bg-white/5 cursor-pointer ring-1 ring-zinc-800/50'
                          }`}
                        >
                          {/* Selection badge */}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shadow-lg z-10"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}

                          <div className="flex items-start gap-2.5">
                            <div className="text-xl sm:text-2xl mt-0.5 flex-shrink-0">
                              {ability.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-zinc-200">{ability.name}</h4>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[ability.category]}`}>
                                  {CATEGORY_SHORT_LABELS[ability.category]}
                                </span>
                              </div>
                              <p className="text-[10px] sm:text-xs text-zinc-500 font-mono mt-1 leading-relaxed line-clamp-2">
                                {ability.description}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                                  <Wind className="w-2.5 h-2.5" />
                                  CD: {ability.cooldown} turni
                                </span>
                                {ability.powerMultiplier && (
                                  <span className="text-[10px] text-red-500/70 font-mono">
                                    ×{ability.powerMultiplier}
                                  </span>
                                )}
                                {ability.healAmount && (
                                  <span className="text-[10px] text-green-500/70 font-mono">
                                    +{ability.healAmount} HP
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                SUCCESS OVERLAY
                ═══════════════════════════════════════════ */}
            <AnimatePresence>
              {isCompleting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="text-center"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="text-5xl mb-3"
                    >
                      🧟
                    </motion.div>
                    <h3 className="text-xl font-bold text-red-400 horror-text">Sopravvissuto Creato!</h3>
                    <p className="text-sm text-zinc-500 font-mono mt-2">
                      Preparati per l&apos;inferno...
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </AnimatePresence>
        </div>

        {/* ── Footer Navigation ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between pt-3 sm:pt-4 gap-2 pb-[env(safe-area-inset-bottom)]"
        >
          <Button
            variant="ghost"
            onClick={currentStep === 1 ? onCancel : goBack}
            className="glass-btn text-zinc-400 hover:text-zinc-200 font-mono text-sm px-3 sm:px-4 min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {currentStep === 1 ? 'Annulla' : 'Indietro'}
          </Button>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentStep === step.id
                    ? 'bg-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
                    : currentStep > step.id
                      ? 'bg-red-900/60'
                      : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>

          {currentStep < 4 ? (
            <Button
              variant="ghost"
              onClick={goNext}
              disabled={!canGoNext}
              className={`font-mono text-sm px-3 sm:px-4 transition-all duration-300 min-h-[44px] ${
                canGoNext
                  ? 'horror-btn bg-red-900/40 hover:bg-red-800/50 text-red-300 hover:text-red-200 border border-red-700/40 hover:border-red-600/50'
                  : 'glass-btn text-zinc-700 cursor-not-allowed'
              }`}
            >
              Avanti
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={handleComplete}
              disabled={!step4Valid || isCompleting}
              className={`font-mono text-sm px-3 sm:px-4 transition-all duration-300 min-h-[44px] ${
                step4Valid && !isCompleting
                  ? 'horror-btn bg-red-700/60 hover:bg-red-600/70 text-white border border-red-500/50 hover:border-red-400/60 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]'
                  : 'glass-btn text-zinc-700 cursor-not-allowed'
              }`}
            >
              <Flame className="w-4 h-4 mr-1.5" />
              Conferma
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ==========================================
// Sub-components
// ==========================================

function StatMiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  const maxRef = 150;
  const pct = Math.min(100, (value / maxRef) * 100);
  return (
    <div className="text-center">
      <p className="text-[10px] text-zinc-500 uppercase font-mono">{label}</p>
      <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden mt-1 mb-1">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, opacity: 0.8 }}
        />
      </div>
      <p className="text-xs font-bold font-mono" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
