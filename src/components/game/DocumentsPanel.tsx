'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { DOCUMENTS } from '@/game/data/documents';
import { LOCATIONS } from '@/game/data/locations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, X, FileText, MapPin, Filter, ChevronDown } from 'lucide-react';
import type { DocumentType, GameDocument } from '@/game/types';

const DOC_TYPE_LABELS: Record<DocumentType, { label: string; icon: string; color: string }> = {
  diary: { label: 'Diario', icon: '📔', color: 'text-amber-300 border-amber-700/30 bg-amber-950/20' },
  umbrella_file: { label: 'File Umbrella', icon: '📁', color: 'text-red-300 border-red-700/30 bg-red-950/20' },
  note: { label: 'Nota', icon: '📝', color: 'text-gray-300 border-gray-700/30 bg-gray-950/20' },
  photo: { label: 'Foto', icon: '📷', color: 'text-emerald-300 border-emerald-700/30 bg-emerald-950/20' },
  report: { label: 'Rapporto', icon: '📋', color: 'text-cyan-300 border-cyan-700/30 bg-cyan-950/20' },
};

const RARITY_COLORS = {
  common: 'border-gray-700/40 bg-gray-900/30',
  uncommon: 'border-green-700/40 bg-green-950/20',
  rare: 'border-purple-700/40 bg-purple-950/20',
  legendary: 'border-amber-500/40 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
};

export default function DocumentsPanel() {
  const { documentsOpen, toggleDocuments, collectedDocuments, currentLocationId } = useGameStore();
  const [selectedDoc, setSelectedDoc] = useState<GameDocument | null>(null);
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');

  // Get collected document objects
  const docs = collectedDocuments
    .map(id => DOCUMENTS[id])
    .filter(Boolean);

  // Filter by type
  const filteredDocs = filterType === 'all'
    ? docs
    : docs.filter(d => d.type === filterType);

  // Group by location
  const docsByLocation = filteredDocs.reduce((acc, doc) => {
    const locName = LOCATIONS[doc.locationId]?.name || 'Sconosciuto';
    if (!acc[locName]) acc[locName] = [];
    acc[locName].push(doc);
    return acc;
  }, {} as Record<string, GameDocument[]>);

  // Count total documents
  const totalDocs = Object.keys(DOCUMENTS).length;
  const secretDocs = docs.filter(d => d.isSecret).length;
  const totalSecretDocs = Object.values(DOCUMENTS).filter(d => d.isSecret).length;

  return (
    <AnimatePresence>
      {documentsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 glass-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) { toggleDocuments(); setSelectedDoc(null); } }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-2xl max-h-[90vh] glass-dark rounded-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">Documenti Raccolti</h3>
                <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/30 text-xs">
                  {docs.length}/{totalDocs}
                </Badge>
                {secretDocs > 0 && (
                  <Badge className="bg-purple-900/50 text-purple-300 border-purple-700/30 text-xs">
                    🔒 {secretDocs}/{totalSecretDocs}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { toggleDocuments(); setSelectedDoc(null); }}
                className="text-gray-500 hover:text-white hover:bg-white/[0.05] h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-2 border-b border-white/[0.06] overflow-x-auto shrink-0">
              <Badge
                className={`cursor-pointer text-[10px] sm:text-xs px-2 py-1 transition-all ${filterType === 'all' ? 'bg-amber-900/50 text-amber-300 border-amber-700/40' : 'bg-white/[0.03] text-white/50 border-white/[0.06] hover:bg-white/[0.06]'}`}
                onClick={() => setFilterType('all')}
              >
                Tutti ({docs.length})
              </Badge>
              {Object.entries(DOC_TYPE_LABELS).map(([type, info]) => {
                const count = docs.filter(d => d.type === type).length;
                if (count === 0) return null;
                return (
                  <Badge
                    key={type}
                    className={`cursor-pointer text-[10px] sm:text-xs px-2 py-1 transition-all ${filterType === type ? `${info.color}` : 'bg-white/[0.03] text-white/50 border-white/[0.06] hover:bg-white/[0.06]'}`}
                    onClick={() => setFilterType(type as DocumentType)}
                  >
                    {info.icon} {info.label} ({count})
                  </Badge>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 inventory-scrollbar">
              {docs.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nessun documento raccolto.</p>
                  <p className="text-gray-600 text-xs mt-1">Esplora e cerca nelle aree per trovare documenti.</p>
                </div>
              ) : selectedDoc ? (
                /* Document Reader */
                <motion.div
                  key={selectedDoc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDoc(null)}
                    className="text-amber-400 hover:text-amber-300 text-xs"
                  >
                    ← Torna alla lista
                  </Button>
                  <div className={`p-4 rounded-lg border ${RARITY_COLORS[selectedDoc.rarity]}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">{selectedDoc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base sm:text-lg font-bold text-white">{selectedDoc.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[9px] ${DOC_TYPE_LABELS[selectedDoc.type].color}`}>
                            {DOC_TYPE_LABELS[selectedDoc.type].icon} {DOC_TYPE_LABELS[selectedDoc.type].label}
                          </Badge>
                          <span className="text-[10px] text-white/30 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {LOCATIONS[selectedDoc.locationId]?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-white/[0.06] pt-3">
                      <p className="text-sm text-white/70 leading-relaxed italic whitespace-pre-line">{selectedDoc.content}</p>
                    </div>
                    {selectedDoc.isSecret && (
                      <div className="mt-3 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-[10px] text-purple-300 font-semibold">🔒 Documento Segreto</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* Document List grouped by location */
                <div className="space-y-4">
                  {Object.entries(docsByLocation).map(([locName, locDocs]) => (
                    <div key={locName}>
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {locName}
                      </div>
                      <div className="space-y-1.5">
                        {locDocs.map(doc => (
                          <motion.button
                            key={doc.id}
                            whileHover={{ scale: 1.01, x: 3 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setSelectedDoc(doc)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer
                              ${RARITY_COLORS[doc.rarity]}
                              hover:border-white/20 hover:bg-white/[0.06]`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{doc.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                                <p className="text-[10px] text-white/40 truncate">
                                  {DOC_TYPE_LABELS[doc.type].icon} {DOC_TYPE_LABELS[doc.type].label}
                                </p>
                              </div>
                              {doc.isSecret && <span className="text-xs">🔒</span>}
                              <ChevronDown className="w-3 h-3 text-white/30" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
