'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/game/store';
import { DOCUMENTS } from '@/game/data/loader';
import { LOCATIONS } from '@/game/data/loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, X, FileText, MapPin, Filter, ChevronDown, Mail, Eye } from 'lucide-react';
import type { DocumentType, GameDocument } from '@/game/types';

const DOC_TYPE_LABELS: Record<DocumentType, { label: string; icon: string; color: string }> = {
  diary: { label: 'Diario', icon: '📔', color: 'text-amber-300 border-amber-700/30 bg-amber-950/20' },
  umbrella_file: { label: 'File Umbrella', icon: '📁', color: 'text-red-300 border-red-700/30 bg-red-950/20' },
  note: { label: 'Nota', icon: '📝', color: 'text-gray-300 border-gray-700/30 bg-gray-950/20' },
  photo: { label: 'Foto', icon: '📷', color: 'text-emerald-300 border-emerald-700/30 bg-emerald-950/20' },
  report: { label: 'Rapporto', icon: '📋', color: 'text-cyan-300 border-cyan-700/30 bg-cyan-950/20' },
  email: { label: 'Email', icon: '📧', color: 'text-blue-300 border-blue-700/30 bg-blue-950/20' },
};

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-500/30 bg-gray-800/40 text-gray-300',
  uncommon: 'border-green-600/30 bg-green-950/30 text-green-300',
  rare: 'border-purple-500/30 bg-purple-950/30 text-purple-200',
  legendary: 'border-amber-400/40 bg-amber-900/30 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
};

/** Check if content contains HTML tags */
function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(content);
}

/** Render document content — supports both plain text and rich HTML */
function DocumentContent({ content, className }: { content: string; className?: string }) {
  if (isHtmlContent(content)) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return (
    <p className={className}>
      {content}
    </p>
  );
}

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

// ─── EMAIL ───
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
        <DocumentContent content={email.body} className="text-sm text-white/70 leading-relaxed whitespace-pre-line prose prose-invert prose-sm" />
      </div>
    </div>
  );
}

// ─── DIARY ───
function DiaryDocumentReader({ doc }: { doc: GameDocument }) {
  // Try to extract a date from the first line for the diary header
  const firstLine = doc.content.split('\n')[0]?.trim() || '';
  const dateMatch = firstLine.match(/^(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{1,2}\s+(?:Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre|January|February|March|April|May|June|July|August|September|October|November|December))/i);
  const hasDateHeader = !!dateMatch;
  const bodyContent = hasDateHeader ? doc.content.split('\n').slice(1).join('\n').trim() : doc.content;

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Leather cover effect */}
      <div className="relative rounded-lg border-2 border-amber-900/40 overflow-hidden shadow-[inset_0_0_30px_rgba(80,50,10,0.15)]">
        {/* Worn page header */}
        <div className="px-4 py-2 border-b border-amber-800/20 flex items-center gap-2 bg-[repeating-linear-gradient(135deg,rgba(139,90,43,0.04)_0px,rgba(139,90,43,0.04)_1px,transparent_1px,transparent_4px)]">
          <span className="text-base">📔</span>
          <span className="text-[11px] font-bold text-amber-400/70 italic tracking-wide">Pagine di diario</span>
        </div>
        {/* Lined page with handwriting feel */}
        <div className="p-5 bg-[linear-gradient(transparent,transparent_27px,rgba(160,120,60,0.08)_27px,rgba(160,120,60,0.08)_28px)]">
          {hasDateHeader && (
            <p className="text-xs text-amber-400/50 font-semibold mb-3 uppercase tracking-wider">{dateMatch[0]}</p>
          )}
          <DocumentContent
            content={bodyContent}
            className="text-sm text-amber-100/70 leading-[1.85] whitespace-pre-line font-serif italic prose prose-invert prose-sm prose-p:text-amber-100/70 prose-strong:text-amber-200/90 prose-headings:text-amber-200/80"
          />
        </div>
        {/* Page edge decoration */}
        <div className="h-3 bg-gradient-to-r from-transparent via-amber-900/10 to-transparent" />
      </div>
    </div>
  );
}

// ─── REPORT ───
function ReportDocumentReader({ doc }: { doc: GameDocument }) {
  const report = parseReportContent(doc.content);

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="relative border border-cyan-700/30 bg-cyan-950/10 rounded-lg overflow-hidden">
        {/* Top classified stripe */}
        <div className="h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-cyan-800/20 bg-cyan-950/20 flex items-center gap-2">
          <span className="text-base">📋</span>
          <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Rapporto Ufficiale</span>
          <Badge className="text-[7px] bg-cyan-900/40 text-cyan-400/70 border-cyan-700/30 ml-auto uppercase tracking-widest">Confidenziale</Badge>
        </div>
        {/* Report header block */}
        {report.header && (
          <div className="px-4 py-2 border-b border-cyan-800/15 bg-cyan-950/10">
            <p className="text-[11px] font-bold text-cyan-200/50 uppercase tracking-wide whitespace-pre-line">{report.header}</p>
          </div>
        )}
        {/* Body */}
        <div className="p-4">
          <DocumentContent
            content={report.body}
            className="text-sm text-white/65 leading-relaxed whitespace-pre-line font-mono prose prose-invert prose-sm prose-p:text-white/65"
          />
        </div>
        {/* Bottom stripe */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      </div>
    </div>
  );
}

// ─── UMBRELLA FILE ───
function UmbrellaFileReader({ doc }: { doc: GameDocument }) {
  return (
    <div className="rounded-lg overflow-hidden">
      <div className="relative border border-red-700/30 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.08)]">
        {/* Red danger stripe */}
        <div className="h-1 bg-gradient-to-r from-red-900/40 via-red-500/40 to-red-900/40" />
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-red-800/20 bg-red-950/20 flex items-center gap-2">
          <span className="text-base">📁</span>
          <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider">Umbrella Corp — CLASSIFICATO</span>
          <Badge className="text-[7px] bg-red-900/60 text-red-300 border-red-700/40 ml-auto uppercase tracking-widest">Top Secret</Badge>
        </div>
        {/* Warning banner */}
        <div className="px-4 py-1.5 bg-red-950/15 border-b border-red-800/10">
          <p className="text-[9px] text-red-400/50 uppercase tracking-[0.15em] text-center">
            ⚠️ Divieto di riproduzione — Livello di accesso: Alpha
          </p>
        </div>
        {/* Body */}
        <div className="p-4 bg-[repeating-linear-gradient(0deg,transparent,transparent_25px,rgba(220,38,38,0.03)_25px,rgba(220,38,38,0.03)_26px)]">
          <DocumentContent
            content={doc.content}
            className="text-sm text-red-100/60 leading-relaxed whitespace-pre-line font-mono prose prose-invert prose-sm prose-p:text-red-100/60"
          />
        </div>
        {/* Bottom */}
        <div className="h-0.5 bg-gradient-to-r from-red-900/30 via-red-500/30 to-red-900/30" />
      </div>
    </div>
  );
}

// ─── PHOTO ───
function PhotoDocumentReader({ doc }: { doc: GameDocument }) {
  const [imgSrc, setImgSrc] = useState(`/api/media/image?ref=doc_img_${doc.id}`);
  const [imgError, setImgError] = useState(false);

  const handleImgError = () => {
    // First attempt failed, try associatedId lookup
    if (!imgSrc.includes('associatedId')) {
      setImgSrc(`/api/media/image?associatedId=${doc.id}`);
    } else {
      setImgError(true);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="relative border border-emerald-700/20 rounded-lg overflow-hidden bg-black/40">
        {/* Header */}
        <div className="px-4 py-2 border-b border-emerald-800/20 bg-emerald-950/15 flex items-center gap-2">
          <span className="text-base">📷</span>
          <span className="text-[11px] font-bold text-emerald-300">Fotografia</span>
        </div>
        {/* Image area */}
        <div className="p-4">
          {!imgError ? (
            <img
              src={imgSrc}
              alt={doc.title}
              className="w-full h-auto max-h-[400px] object-contain rounded-sm"
              onError={handleImgError}
            />
          ) : (
            <div className="flex items-center justify-center h-40 bg-black/30 rounded-md border border-dashed border-white/[0.06]">
              <div className="text-center">
                <span className="text-3xl mb-2 block opacity-30">📷</span>
                <p className="text-[10px] text-white/20">Nessuna immagine associata</p>
              </div>
            </div>
          )}
          {/* Caption / description below the photo */}
          {doc.content && (
            <div className="mt-3 px-1">
              <DocumentContent
                content={doc.content}
                className="text-[12px] text-emerald-100/50 leading-relaxed whitespace-pre-line italic text-center prose prose-invert prose-sm prose-p:text-emerald-100/50"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NOTE ───
function NoteDocumentReader({ doc }: { doc: GameDocument }) {
  return (
    <div className="rounded-lg overflow-hidden">
      {/* Sticky-note / torn paper style */}
      <div className="relative">
        {/* Tape/pin decoration */}
        <div className="flex justify-center -mb-1 relative z-10">
          <div className="w-10 h-3 bg-yellow-200/70 rounded-sm rotate-[-2deg] shadow-sm" />
        </div>

        <div className="relative rounded-md border border-gray-600/20 bg-gradient-to-b from-gray-100/[0.07] to-gray-100/[0.03] p-5 shadow-[4px_4px_15px_rgba(0,0,0,0.3)]
          before:absolute before:top-0 before:right-0 before:w-6 before:h-6 before:bg-gradient-to-br before:from-transparent before:via-transparent before:to-gray-800/10 before:rounded-bl-[20px] before:content-['']
          after:absolute after:bottom-0 after:left-0 after:w-4 after:h-4 after:bg-gradient-to-tr after:from-transparent after:via-transparent after:to-gray-800/10 after:rounded-tr-[15px] after:content-['']
        ">
          {/* Note header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📝</span>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nota</span>
            {/* Pencil underline decoration */}
            <div className="flex-1 h-px bg-gradient-to-r from-gray-500/20 via-gray-500/30 to-transparent" />
          </div>
          {/* Content */}
          <DocumentContent
            content={doc.content}
            className="text-sm text-white/60 leading-[1.8] whitespace-pre-line prose prose-invert prose-sm prose-p:text-white/60
              [&_p]:indent-0"
          />
          {/* Ink smudge decoration */}
          <div className="mt-4 flex justify-end">
            <div className="w-6 h-1 bg-gray-500/10 rounded-full blur-[1px]" />
          </div>
        </div>
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
                        <Badge className={`text-[9px] ${RARITY_COLORS[selectedDoc.rarity] || RARITY_COLORS.common} border`}>
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
                                ${RARITY_COLORS[doc.rarity] || RARITY_COLORS.common}
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
