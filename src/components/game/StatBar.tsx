'use client';

import { motion } from 'framer-motion';

interface StatBarProps {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
  icon?: string;
}

const defaultColors: Record<string, string> = {
  HP: 'bg-red-500',
  ATK: 'bg-orange-500',
  DEF: 'bg-cyan-500',
  SPD: 'bg-yellow-500',
};

export default function StatBar({ label, value, maxValue, color, icon }: StatBarProps) {
  const percentage = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;
  const barColor = color || defaultColors[label] || 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-xs font-mono w-8 flex items-center gap-1 flex-shrink-0">
        {icon && <span>{icon}</span>}
        {label}
      </span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            boxShadow: `0 0 6px ${barColor.includes('red') ? 'rgba(239,68,68,0.3)' : barColor.includes('orange') ? 'rgba(249,115,22,0.3)' : barColor.includes('cyan') ? 'rgba(6,182,212,0.3)' : 'rgba(234,179,8,0.3)'}`,
          }}
        />
      </div>
      <span className="text-gray-300 text-xs font-mono w-6 text-right flex-shrink-0">{value}</span>
    </div>
  );
}
