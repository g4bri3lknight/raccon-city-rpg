import { RunStats, EndingType } from '@/game/types';

export interface LeaderboardEntry {
  date: string;
  characterName: string;
  archetype: string;
  endingType: EndingType;
  ngPlusCycle: number;
  turnsSurvived: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  finalLevel: number;
  playTimeSeconds: number;
  score: number;
  runStats: Partial<RunStats>;
}

const LEADERBOARD_KEY = 'raccoon_city_leaderboard';
const MAX_ENTRIES = 50;

export function calculateScore(stats: RunStats, achievementsCount: number): number {
  let score = 1000;

  // Combat
  score += stats.enemiesDefeated * 50;
  score += stats.bossesDefeated * 200;

  // Exploration
  score += stats.secretRoomsDiscovered * 100;
  score += stats.documentsFound * 50;

  // Speed (encourage fast runs)
  score -= stats.turnsSurvived * 1;

  // NG+ cycle
  score += stats.ngPlusCycle * 500;

  // Ending bonuses
  if (stats.endingType === 'hero') score += 300;
  if (stats.endingType === 'truth') score += 500;
  if (stats.endingType === 'dark') score -= 200;

  // Perfection
  score += stats.perfectCombats * 200;

  // Achievement bonus
  score += achievementsCount * 100;

  // Quests
  score += stats.questsCompleted * 50;
  score += stats.questChainsCompleted * 150;

  return Math.max(0, Math.round(score));
}

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export function addLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const current = getLeaderboard();
  current.push(entry);
  // Sort by score descending
  current.sort((a, b) => b.score - a.score);
  // Keep only top MAX_ENTRIES
  const trimmed = current.slice(0, MAX_ENTRIES);
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
    }
  } catch {}
  return trimmed;
}

export function formatPlayTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getEndingLabel(endingType: EndingType | null): string {
  switch (endingType) {
    case 'escape': return '🏁 Fuga';
    case 'hero': return '🦸 Eroe';
    case 'truth': return '🔍 Verità';
    case 'dark': return '🌑 Oscuro';
    default: return '❓ Sconosciuto';
  }
}

export function getEndingColor(endingType: EndingType | null): string {
  switch (endingType) {
    case 'escape': return '#22d3ee';
    case 'hero': return '#f59e0b';
    case 'truth': return '#34d399';
    case 'dark': return '#ef4444';
    default: return '#6b7280';
  }
}
