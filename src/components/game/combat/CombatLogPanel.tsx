'use client';

import { motion } from 'framer-motion';
import { CHARACTER_IMAGES, mediaUrl } from '@/game/data/loader';
import LogText from '@/components/game/LogText';
import type { Character } from '@/game/types';
import type { CombatLogPanelProps } from './types';

export default function CombatLogPanel({
  log,
  party,
  dataVersion,
  logRef,
}: CombatLogPanelProps) {
  return (
    <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-white/[0.06] glass-dark-inner p-2.5 sm:p-3 inventory-scrollbar">
      <div className="space-y-0.5">
        {log.map((entry, i) => {
          const isNew = i === log.length - 1;
          return (
            <motion.p
              key={i}
              initial={isNew ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              className={`text-[15px] sm:text-base leading-relaxed ${
                entry.isCritical
                  ? 'text-yellow-400 font-bold'
                  : entry.isMiss
                  ? 'text-gray-500 italic'
                  : entry.damage && entry.damage > 0
                  ? entry.actorType === 'player' ? 'text-green-400' : 'text-red-400'
                  : entry.heal ? 'text-green-300'
                  : entry.action === 'Sanguinamento' ? 'text-red-400'
                  : entry.action === 'Avvelenamento' ? 'text-purple-400'
                  : entry.message.startsWith('---') ? 'text-gray-600 text-center'
                  : 'text-gray-400'
              }`}
            >
              {entry.isCritical && '💥 '}
              {entry.isMiss && '💨 '}
              <LogText text={entry.message} party={party.map((p: Character) => ({ name: p.name, avatarSrc: mediaUrl(p.avatarUrl || CHARACTER_IMAGES[p.archetype] || '', dataVersion) }))} />
            </motion.p>
          );
        })}
      </div>
    </div>
  );
}
