'use client';

import { useMemo, useState } from 'react';
import { useGameStore } from '@/game/store';
import { LOCATIONS, DOORS_DATA, findRoomLocation } from '@/game/data/loader';
import { Map } from 'lucide-react';

export default function MiniMap() {
  const currentLocationId = useGameStore(s => s.currentLocationId);
  const visitedLocations = useGameStore(s => s.visitedLocations);
  const unlockedPaths = useGameStore(s => s.unlockedPaths);
  const party = useGameStore(s => s.party);
  const toggleMap = useGameStore(s => s.toggleMap);
  const dataVersion = useGameStore(s => s.dataVersion);

  const [hovered, setHovered] = useState(false);

  const mapData = useMemo(() => {
    const currentLoc = LOCATIONS[currentLocationId];
    if (!currentLoc) return { current: null, connections: [] };

    // Compute connected location IDs from cross-location doors
    const roomIds = currentLoc.rooms?.length
      ? new Set(currentLoc.rooms.map(r => r.id))
      : null;
    const connectedLocationIds: string[] = [];
    if (roomIds) {
      for (const door of DOORS_DATA) {
        if (door.state === 'inaccessible') continue;
        const fromLoc = findRoomLocation(door.fromRoomId);
        const toLoc = findRoomLocation(door.toRoomId);
        if (!fromLoc || !toLoc) continue;
        if (roomIds.has(door.fromRoomId) && toLoc.locationId !== currentLocationId) {
          if (!connectedLocationIds.includes(toLoc.locationId)) connectedLocationIds.push(toLoc.locationId);
        }
        if (roomIds.has(door.toRoomId) && fromLoc.locationId !== currentLocationId) {
          if (!connectedLocationIds.includes(fromLoc.locationId)) connectedLocationIds.push(fromLoc.locationId);
        }
      }
    }

    const lockedLocs = currentLoc.lockedLocations || [];

    const hasKey = (keyId: string) =>
      party.some(p => p.inventory.some(i => i.itemId === keyId));
    const isPathUnlocked = (fromId: string, toId: string) =>
      unlockedPaths.includes(`${fromId}→${toId}`);

    // Build connected locations data
    const connections = connectedLocationIds.map(locId => {
      const loc = LOCATIONS[locId];
      if (!loc) return null;
      const locked = lockedLocs.find(l => l.locationId === locId);
      const isLocked = !!locked;
      const canUnlock = isLocked && hasKey(locked.requiredItemId);
      const isUnlocked = isLocked && isPathUnlocked(currentLocationId, locId);
      const visited = visitedLocations.includes(locId);

      return {
        id: locId,
        name: loc.shortName || loc.name,
        icon: loc.mapIcon || '📍',
        visited,
        isLocked,
        canUnlock,
        isUnlocked,
      };
    }).filter(Boolean) as { id: string; name: string; icon: string; visited: boolean; isLocked: boolean; canUnlock: boolean; isUnlocked: boolean }[];

    return {
      current: {
        id: currentLocationId,
        name: currentLoc.shortName || currentLoc.name,
        icon: currentLoc.mapIcon || '📍',
      },
      connections,
    };
  }, [currentLocationId, visitedLocations, unlockedPaths, party, dataVersion]);

  if (!mapData.current) return null;

  // Limit connections shown in tiny minimap to max 4
  const visibleConnections = mapData.connections.slice(0, 4);

  return (
    <div
      className="absolute top-2 left-2 z-10"
      style={{ width: 150 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={toggleMap}
        className="w-full rounded-lg border border-white/[0.12] bg-black/50 backdrop-blur-md p-2 cursor-pointer transition-all duration-200 hover:bg-black/60 hover:border-white/[0.2]"
        title="Apri mappa"
      >
        {/* Header */}
        <div className="flex items-center gap-1 mb-1.5">
          <Map className="w-3 h-3 text-red-400 shrink-0" />
          <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider">Mini Mappa</span>
        </div>

        {/* Current location — red dot */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] shrink-0" />
          <span className="text-[9px] font-semibold text-red-300 truncate">{mapData.current.name}</span>
        </div>

        {/* Connected locations */}
        <div className="space-y-0.5 ml-1">
          {visibleConnections.map(conn => {
            let dotColor = 'bg-green-500/70'; // unlocked or free
            let textColor = 'text-green-400/60';

            if (conn.isLocked && !conn.canUnlock && !conn.isUnlocked) {
              dotColor = 'bg-amber-500/70'; // locked, no key
              textColor = 'text-amber-400/60';
            } else if (conn.isLocked && conn.canUnlock && !conn.isUnlocked) {
              dotColor = 'bg-yellow-400'; // locked, have key
              textColor = 'text-yellow-300';
            } else if (!conn.visited) {
              dotColor = 'bg-gray-500/60';
              textColor = 'text-white/40';
            }

            return (
              <div key={conn.id} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                <span className={`text-[8px] truncate ${textColor}`}>
                  {conn.icon} {conn.name}
                </span>
              </div>
            );
          })}
        </div>

        {hovered && (
          <div className="mt-1.5 pt-1.5 border-t border-white/[0.08] text-[8px] text-white/30 text-center">
            Clicca per mappa completa
          </div>
        )}
      </button>
    </div>
  );
}
