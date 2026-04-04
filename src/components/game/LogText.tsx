'use client';

import { useMemo } from 'react';
import { CHARACTER_IMAGES } from '@/game/data/enemies';

const EMOJI_TO_PNG: Record<string, string> = {
  '🎀': '/icons/items/ink_ribbon.png',
  '⚔️': '/icons/items/combat_knife.png',
};

interface CharacterAvatar {
  name: string;
  avatarSrc: string;
}

// Extract character name→avatar from party array
function buildNameAvatarMap(party: CharacterAvatar[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of party) {
    if (c.name && c.avatarSrc) map.set(c.name, c.avatarSrc);
  }
  return map;
}

interface LogTextProps {
  text: string;
  className?: string;
  party?: CharacterAvatar[];
}

export default function LogText({ text, className = '', party }: LogTextProps) {
  const segments = useMemo(() => {
    interface Segment {
      type: 'text' | 'emoji' | 'charName';
      content: string;
      avatarSrc?: string;
    }
    const parts: Segment[] = [];

    // Build name→avatar map if party is provided
    const nameMap = party && party.length > 0 ? buildNameAvatarMap(party) : null;

    // Step 1: split by emoji-to-PNG patterns
    const allEmojis = Object.keys(EMOJI_TO_PNG);
    const emojiEscaped = allEmojis.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const emojiRegex = new RegExp(`(${emojiEscaped})`, 'g');

    const textSegments: string[] = [];
    let lastIdx = 0;
    let m;
    while ((m = emojiRegex.exec(text)) !== null) {
      if (m.index > lastIdx) textSegments.push(text.slice(lastIdx, m.index));
      parts.push({ type: 'emoji', content: m[0] });
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < text.length) textSegments.push(text.slice(lastIdx));

    // Step 2: for each remaining text segment, split by character names
    if (nameMap && nameMap.size > 0) {
      // Sort names longest-first to avoid partial matches (e.g. "Viktor Stahl" before "Viktor")
      const sortedNames = [...nameMap.keys()].sort((a, b) => b.length - a.length);
      const nameEscaped = sortedNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const nameRegex = new RegExp(`(${nameEscaped})`, 'g');

      for (const seg of textSegments) {
        let nameIdx = 0;
        let nm;
        let hasName = false;
        while ((nm = nameRegex.exec(seg)) !== null) {
          hasName = true;
          if (nm.index > nameIdx) {
            parts.push({ type: 'text', content: seg.slice(nameIdx, nm.index) });
          }
          parts.push({ type: 'charName', content: nm[0], avatarSrc: nameMap.get(nm[0]) });
          nameIdx = nm.index + nm[0].length;
        }
        if (hasName) {
          if (nameIdx < seg.length) parts.push({ type: 'text', content: seg.slice(nameIdx) });
        } else {
          parts.push({ type: 'text', content: seg });
        }
      }
    } else {
      for (const seg of textSegments) parts.push({ type: 'text', content: seg });
    }

    return parts;
  }, [text, party]);

  return (
    <span className={`inline ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'emoji' && EMOJI_TO_PNG[seg.content]) {
          return (
            <img
              key={i}
              src={EMOJI_TO_PNG[seg.content]}
              alt=""
              width={18}
              height={18}
              className="inline-block align-middle mx-px"
              style={{ objectFit: 'contain' }}
              draggable={false}
            />
          );
        }
        if (seg.type === 'charName' && seg.avatarSrc) {
          return (
            <span key={i} className="inline-flex items-center align-middle gap-0.5">
              <img
                src={seg.avatarSrc}
                alt=""
                width={18}
                height={18}
                className="inline-block rounded-sm"
                style={{ objectFit: 'cover' }}
                draggable={false}
              />
              <span className="font-semibold text-white/90">{seg.content}</span>
            </span>
          );
        }
        return <span key={i}>{seg.content}</span>;
      })}
    </span>
  );
}
