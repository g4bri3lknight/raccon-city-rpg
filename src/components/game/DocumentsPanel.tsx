'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { DOCUMENTS } from '@/game/data/loader';
import { LOCATIONS } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, X, FileText, MapPin, Filter, ChevronDown, Mail, Eye, EyeOff } from 'lucide-react';
import type { DocumentType, GameDocument } from '@/game/types';

const DOC_TYPE_LABELS: Record<DocumentType, { label: string; icon: string; color: string }> = {
  diary: { label: 'Diario', icon: '📔', color: 'text-amber-300 border-amber-700/30 bg-amber-950/20' },
  umbrella_file: { label: 'File Umbrella', icon: '📁', color: 'text-red-300 border-red-700/30 bg-red-950/20' },
  note: { label: 'Nota', icon: '📝', color: 'text-gray-300 border-gray-700/30 bg-gray-950/20' },
  photo: { label: 'Foto', icon: '📷', color: 'text-emerald-300 border-emerald-700/30 bg-emerald-950/20' },
  report: { label: 'Rapporto', icon: '📋', color: 'text-cyan-300 border-cyan-700/30 bg-cyan-950/20' },
  email: { label: 'Email', icon: '📧', color: 'text-blue-300 border-blue-700/30 bg-blue-950/20' },
};

const RARITY_COLORS = {
  common: 'border-gray-700/40 bg-gray-900/30',
  uncommon: 'border-green-700/40 bg-green-950/20',
  rare: 'border-purple-700/40 bg-purple-950/20',
  legendary: 'border-amber-500/40 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
};

// Parse email content into structured fields
function parseEmailContent(content: string) {
  const lines = content.split('\n');
  const fields: Record<string, string> = {};
  let bodyStartIdx = 0;
  let headerDone = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (headerDone || i > 0) {
        bodyStartIdx = i + 1;
        break;
      }
      continue;
    }
    if (line.startsWith('Da:') || line.startsWith('From:')) {
      fields.from = line.replace(/^(Da|From):\s*/, '');
      headerDone = true;
    } else if (line.startsWith('A:') || line.startsWith('To:')) {
      fields.to = line.replace(/^(A|To):\s*/, '');
      headerDone = true;
    } else if (line.startsWith('Oggetto:') || line.startsWith('Subject:')) {
      fields.subject = line.replace(/^(Oggetto|Subject):\s*/, '');
      headerDone = true;
    } else if (line.startsWith('Data:') || line.startsWith('Date:')) {
      fields.date = line.replace(/^(Data|Date):\s*/, '');
      headerDone = true;
    } else if (line.startsWith('Priorità:') || line.startsWith('Priority:')) {
      fields.priority = line.replace(/^(Priorità|Priority):\s*/, '');
      headerDone = true;
    } else if (headerDone && !fields.body) {
      bodyStartIdx = i;
      break;
    }
  }

  fields.body = lines.slice(bodyStartIdx).join('\n').trim();
  return fields;
}

// Parse report content into structured fields
function parseReportContent(content: string) {
  const lines = content.split('\n');
  const headerLines: string[] = [];
  let bodyStartIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (headerLines.length > 0) {
        bodyStartIdx = i + 1;
        break;
      }
      continue;
    }
    // Check if it looks like a header line (UPPERCASE or starts with known prefixes)
    if (
      line === line.toUpperCase() ||
      line.startsWith('REGISTRO') ||
      line.startsWith('REPORT') ||
      line.startsWith('MEMO') ||
      line.startsWith('PROGETTO') ||
      line.startsWith('ORDINE') ||
      line.startsWith('SETTIMANA') ||
      line.startsWith('Giorno')
    ) {
      headerLines.push(line);
    } else {
      bodyStartIdx = i;
      break;
    }
  }

  return {
    header: headerLines.join('\n').trim(),
    body: lines.slice(bodyStartIdx).join('\n').trim() || content,
  };
}

// Email-styled document reader
function EmailDocumentReader({ doc }: { doc: GameDocument }) {
  const email = parseEmailContent(doc.content);

  return (
    <div className="rounded-lg border border-blue-700/30 bg-blue-950/10 overflow-hidden">
      {/* Email header bar */}
      <div className="px-4 py-3 border-b border-blue-800/30 bg-blue-950/20">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Email</span>
          {email.priority && (
            <Badge className="text-[9px] bg-red-900/50 text-red-300 border-red-700/30 ml-auto">
              {email.priority}
            </Badge>
          )}
          {email.date && (
            <span className="text-[10px] text-white/30 ml-auto">{email.date}</span>
          )}
        </div>
        {email.subject && (
          <h4 className="text-sm sm:text-base font-bold text-white">{email.subject}</h4>
        )}
        <div className="mt-2 space-y-0.5">
          {email.from && (
            <div className="text-[11px]">
              <span className="text-white/40 font-medium">Da: </span>
              <span className="text-blue-200/80">{email.from}</span>
            </div>
          )}
          {email.to && (
            <div className="text-[11px]">
              <span className="text-white/40 font-medium">A: </span>
              <span className="text-blue-200/80">{email.to}</span>
            </div>
          )}
        </div>
      </div>
      {/* Email body */}
      <div className="p-4">
        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{email.body}</p>
      </div>
    </div>
  );
}

// Diary-styled document reader
function DiaryDocumentReader({ doc }: { doc: GameDocument }) {
  return (
    <div className="rounded-lg border border-amber-700/30 bg-amber-950/10 overflow-hidden">
      <div className="px-4 py-2 border-b border-amber-800/30 bg-amber-950/20 flex items-center gap-2">
        <span className="text-base">📔</span>
        <span className="text-xs font-bold text-amber-300 italic">Pagine scritte a mano</span>
      </div>
      <div className="p-4 bg-[repeating-linear-gradient(transparent,transparent_27px,rgba(180,140,80,0.06)_27px,rgba(180,140,80,0.06)_28px)]">
        <p className="text-sm text-amber-100/70 leading-relaxed italic whitespace-pre-line font-serif">
          {doc.content}
        </p>
      </div>
    </div>
  );
}

// Report-styled document reader
function ReportDocumentReader({ doc }: { doc: GameDocument }) {
  const report = parseReportContent(doc.content);

  return (
    <div className="rounded-lg border border-cyan-700/30 bg-cyan-950/10 overflow-hidden">
      <div className="px-4 py-2 border-b border-cyan-800/30 bg-cyan-950/20 flex items-center gap-2">
        <span className="text-base">📋</span>
        <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Rapporto Ufficiale</span>
      </div>
      {report.header && (
        <div className="px-4 py-2 border-b border-cyan-800/20 bg-cyan-950/10">
          <p className="text-xs font-bold text-cyan-200/60 uppercase tracking-wide whitespace-pre-line">{report.header}</p>
        </div>
      )}
      <div className="p-4">
        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{report.body}</p>
      </div>
    </div>
  );
}

// Umbrella file reader
function UmbrellaFileReader({ doc }: { doc: GameDocument }) {
  return (
    <div className="rounded-lg border border-red-700/30 bg-red-950/10 overflow-hidden">
      <div className="px-4 py-2 border-b border-red-800/30 bg-red-950/20 flex items-center gap-2">
        <span className="text-base">📁</span>
        <span className="text-xs font-bold text-red-300 uppercase tracking-wider">Umbrella Corp — CLASSIFICATO</span>
        <Badge className="text-[8px] bg-red-900/60 text-red-400 border-red-700/40 ml-auto uppercase">Top Secret</Badge>
      </div>
      <div className="p-4">
        <p className="text-sm text-red-100/70 leading-relaxed whitespace-pre-line">{doc.content}</p>
      </div>
    </div>
  );
}

// Photo reader
function PhotoDocumentReader({ doc }: { doc: GameDocument }) {
  return (
    <div className="rounded-lg border border-emerald-700/30 bg-emerald-950/10 overflow-hidden">
      <div className="px-4 py-2 border-b border-emerald-800/30 bg-emerald-950/20 flex items-center gap-2">
        <span className="text-base">📷</span>
        <span className="text-xs font-bold text-emerald-300">Fotografia</span>
      </div>
      <div className="p-4">
        <p className="text-sm text-emerald-100/70 leading-relaxed whitespace-pre-line italic">{doc.content}</p>
      </div>
    </div>
  );
}

// Note reader
function NoteDocumentReader({ doc }: { doc: GameDocument }) {
  return (
    <div className="rounded-lg border border-gray-700/30 bg-gray-950/10 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-700/30 bg-gray-950/20 flex items-center gap-2">
        <span className="text-base">📝</span>
        <span className="text-xs font-bold text-gray-300">Nota</span>
      </div>
      <div className="p-4">
        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{doc.content}</p>
      </div>
    </div>
  );
}

function DocumentReader({ doc }: { doc: GameDocument }) {
  switch (doc.type) {
    case 'email': return <EmailDocumentReader doc={doc} />;
    case 'diary': return <DiaryDocumentReader doc={doc} />;
    case 'report': return <ReportDocumentReader doc={doc} />;
    case 'umbrella_file': return <UmbrellaFileReader doc={doc} />;
    case 'photo': return <PhotoDocumentReader doc={doc} />;
    case 'note': return <NoteDocumentReader doc={doc} />;
    default: return <NoteDocumentReader doc={doc} />;
  }
}

export default function DocumentsPanel() {
  const { documentsOpen, toggleDocuments, collectedDocuments, currentLocationId, readDocuments, markDocumentRead } = useGameStore();
  const [selectedDoc, setSelectedDoc] = useState<GameDocument | null>(null);
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');

  // Get collected document objects
  const docs = collectedDocuments
    .map(id => DOCUMENTS[id])
    .filter(Boolean);

  // Count unread
  const unreadCount = docs.filter(d => !readDocuments.includes(d.id)).length;

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

  const handleSelectDoc = (doc: GameDocument) => {
    setSelectedDoc(doc);
    markDocumentRead(doc.id);
  };

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
                <h3 className="text-base sm:text-lg font-bold text-white">Documenti</h3>
                <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/30 text-xs">
                  {docs.length}/{totalDocs}
                </Badge>
                {unreadCount > 0 && (
                  <Badge className="bg-blue-900/50 text-blue-300 border-blue-700/30 text-xs animate-pulse">
                    {unreadCount} nuovi
                  </Badge>
                )}
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

            {/* Filter tabs — hidden when reading a document */}
            {!selectedDoc && (
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
            )}

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
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs h-8 px-2"
                  >
                    ← Torna alla lista
                  </Button>

                  {/* Document title & meta */}
                  <div className="flex items-start gap-3 mb-1">
                    <span className="text-2xl">{selectedDoc.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-bold text-white">{selectedDoc.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`text-[9px] ${DOC_TYPE_LABELS[selectedDoc.type].color}`}>
                          {DOC_TYPE_LABELS[selectedDoc.type].icon} {DOC_TYPE_LABELS[selectedDoc.type].label}
                        </Badge>
                        <span className="text-[10px] text-white/30 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {LOCATIONS[selectedDoc.locationId]?.name}
                        </span>
                        <Badge className={`text-[9px] ${RARITY_COLORS[selectedDoc.rarity]} border`}>
                          {selectedDoc.rarity === 'legendary' ? '⭐' : selectedDoc.rarity === 'rare' ? '💜' : selectedDoc.rarity === 'uncommon' ? '💚' : '⚪'} {selectedDoc.rarity}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Type-specific reader */}
                  <DocumentReader doc={selectedDoc} />

                  {selectedDoc.isSecret && (
                    <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <p className="text-[10px] text-purple-300 font-semibold">🔒 Documento Segreto</p>
                    </div>
                  )}
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
                        {locDocs.map(doc => {
                          const isRead = readDocuments.includes(doc.id);
                          return (
                            <motion.button
                              key={doc.id}
                              whileHover={{ scale: 1.01, x: 3 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => handleSelectDoc(doc)}
                              className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer
                                ${RARITY_COLORS[doc.rarity]}
                                ${isRead ? 'opacity-70' : 'hover:border-white/20 hover:bg-white/[0.06]'}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{doc.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isRead ? 'text-white/60' : 'text-white'}`}>{doc.title}</p>
                                  <p className="text-[10px] text-white/40 truncate">
                                    {DOC_TYPE_LABELS[doc.type].icon} {DOC_TYPE_LABELS[doc.type].label}
                                  </p>
                                </div>
                                {!isRead && (
                                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                                )}
                                {isRead && (
                                  <Eye className="w-3 h-3 text-white/20 shrink-0" />
                                )}
                                {doc.isSecret && <span className="text-xs">🔒</span>}
                                <ChevronDown className="w-3 h-3 text-white/30" />
                              </div>
                            </motion.button>
                          );
                        })}
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
