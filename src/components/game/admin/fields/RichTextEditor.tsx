'use client';

import { useState, useEffect, useRef } from 'react';
import { plainTextToHtml } from './helpers';

// ═══════════════════════════════════════════════════════════════
// Rich Text Editor — contentEditable-based editor with formatting toolbar
// ═══════════════════════════════════════════════════════════════
export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const isFirstMount = useRef(true);

  // Sync external value into contentEditable div
  useEffect(() => {
    if (editorRef.current) {
      // Always set on first mount, then only when value changes externally
      if (isFirstMount.current || !isInternalChange.current) {
        editorRef.current.innerHTML = plainTextToHtml(value);
      }
    }
    isFirstMount.current = false;
    isInternalChange.current = false;
  }, [value]);

  // Save/restore selection so toolbar buttons don't lose the user's text selection
  const saveSelection = (): Range | null => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) return sel.getRangeAt(0).cloneRange();
    return null;
  };
  const restoreSelection = (range: Range | null) => {
    if (!range) return;
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  };

  const execCmd = (cmd: string, val?: string) => {
    const saved = saveSelection();
    if (editorRef.current) editorRef.current.focus();
    if (saved) restoreSelection(saved);
    document.execCommand(cmd, false, val);
    syncContent();
  };

  const syncContent = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const newHtml = editorRef.current.innerHTML;
      onChange(newHtml);
      // Reset flag after a tick so the effect doesn't overwrite
      setTimeout(() => { isInternalChange.current = false; }, 0);
    }
  };

  const handleColor = (color: string) => {
    execCmd('foreColor', color);
  };

  const handleHighlight = (color: string) => {
    execCmd('hiliteColor', color);
  };

  const clearFormatting = () => {
    execCmd('removeFormat');
  };

  // Toggle bullet list manually — document.execCommand('insertUnorderedList') is unreliable
  const toggleUnorderedList = () => {
    const saved = saveSelection();
    if (!editorRef.current || !saved) return;
    editorRef.current.focus();
    restoreSelection(saved);

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const content = range.extractContents();

    // Build list items from extracted content
    const fragment = document.createDocumentFragment();
    const items: Node[] = [];

    const collectBlockNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        text.split(/\n/).forEach((line, i) => {
          if (line.trim() || i === 0) {
            const li = document.createElement('li');
            li.textContent = line;
            items.push(li);
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === 'li') {
          items.push(el);
        } else if (tag === 'br') {
          // br → new list item on next text
          const li = document.createElement('li');
          items.push(li);
        } else {
          // Wrap other block/inline elements in <li>
          const li = document.createElement('li');
          li.appendChild(el.cloneNode(true));
          items.push(li);
        }
      }
    };

    if (content.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      content.childNodes.forEach(collectBlockNodes);
    } else {
      collectBlockNodes(content);
    }

    // If no items extracted, use the selected text as a single item
    if (items.length === 0) {
      const li = document.createElement('li');
      li.textContent = sel.toString();
      items.push(li);
    }

    const ul = document.createElement('ul');
    items.forEach(li => ul.appendChild(li));

    range.insertNode(ul);
    sel.removeAllRanges();
    sel.addRange(range);
    syncContent();
  };

  return (
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 rounded-t-md bg-white/[0.06] border border-white/[0.08] border-b-0">
        <ToolbarBtn onClick={() => execCmd('bold')} title="Grassetto"><b className="text-[13px]">B</b></ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('italic')} title="Corsivo"><i className="text-[13px]">I</i></ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('underline')} title="Sottolineato"><u className="text-[13px]">S</u></ToolbarBtn>
        <div className="w-px h-4 bg-white/[0.1] mx-1" />
        <ToolbarBtn onClick={() => execCmd('formatBlock', '<h3>')} title="Titolo 3" className="font-bold text-[12px]">H3</ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('formatBlock', '<p>')} title="Paragrafo" className="text-[12px]">¶</ToolbarBtn>
        <ToolbarBtn onClick={toggleUnorderedList} title="Lista" className="text-[12px]">•≡</ToolbarBtn>
        <div className="w-px h-4 bg-white/[0.1] mx-1" />
        {/* Color picker */}
        <PickerDropdown
          trigger={<><span className="text-[13px]">A</span><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 block" /></>}
          title="Colore testo"
        >
          {['#22c55e', '#ef4444', '#10b981', '#06b6d4', '#a855f7', '#ec4899', '#f59e0b', '#ffffff', '#94a3b8'].map(c => (
            <button key={c} type="button" onMouseDown={e => { e.preventDefault(); handleColor(c); }}
              className="w-5 h-5 rounded-sm border border-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </PickerDropdown>
        {/* Highlight picker */}
        <PickerDropdown
          trigger={<span className="text-[13px]">🖌</span>}
          title="Evidenzia"
        >
          {[
            { c: 'rgba(34,197,94,0.3)', l: 'Verde' },
            { c: 'rgba(251,191,36,0.3)', l: 'Giallo' },
            { c: 'rgba(239,68,68,0.3)', l: 'Rosso' },
            { c: 'rgba(59,130,246,0.3)', l: 'Blu' },
            { c: 'rgba(168,85,247,0.3)', l: 'Viola' },
            { c: 'transparent', l: 'Rimuovi' },
          ].map(h => (
            <button key={h.l} type="button" onMouseDown={e => { e.preventDefault(); handleHighlight(h.c); }}
              className="px-1.5 py-0.5 text-[11px] rounded border border-white/10 hover:bg-white/10 transition-colors"
              style={h.c !== 'transparent' ? { backgroundColor: h.c } : {}}
              title={h.l}
            >
              {h.l}
            </button>
          ))}
        </PickerDropdown>
        <div className="w-px h-4 bg-white/[0.1] mx-1" />
        <ToolbarBtn onClick={clearFormatting} title="Rimuovi formattazione" className="text-[12px]">✕</ToolbarBtn>
      </div>
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        onPaste={e => {
          // Allow paste but strip external styles, keep basic formatting
          e.preventDefault();
          const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
          document.execCommand('insertHTML', false, text);
          syncContent();
        }}
        data-placeholder={placeholder ?? 'Scrivi il contenuto del documento...'}
        className="min-h-[120px] max-h-[240px] overflow-y-auto admin-scrollbar text-[13px] bg-white/[0.04] border border-white/[0.1] rounded-b-md px-3 py-2.5 text-white/80 placeholder-white/20 focus:outline-none focus:border-emerald-500/50 prose prose-invert prose-sm prose-p:text-white/80 prose-h3:text-emerald-300/80 prose-strong:text-white/90 prose-em:text-white/70 prose-li:text-white/70 [&_*]:text-[13px] [&_h3]:text-[15px] [&_li]:text-[12px]"
        style={{ lineHeight: '1.7' }}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: rgba(255,255,255,0.2);
          pointer-events: none;
          font-style: italic;
        }
        [contenteditable][data-placeholder]:focus::before {
          content: none;
        }
        [contenteditable] ul {
          list-style-type: disc !important;
          margin-left: 1.2em !important;
          padding-left: 0.5em !important;
        }
        [contenteditable] ul li {
          display: list-item !important;
          margin-left: 0.3em;
          padding-left: 0.2em;
        }
        [contenteditable] ul li::marker {
          color: rgba(255,255,255,0.6);
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Click-toggle dropdown for toolbar pickers
// ═══════════════════════════════════════════════════════════════
function PickerDropdown({ children, trigger, title }: { children: React.ReactNode; trigger: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        title={title}
        className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors text-center ${open ? 'text-white/80 bg-white/[0.12]' : ''}`}
      >
        {trigger}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-1.5 rounded-md bg-black border border-white/[0.12] shadow-xl flex flex-wrap gap-1 z-[9999]">
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Toolbar Button for RichTextEditor
// ═══════════════════════════════════════════════════════════════
function ToolbarBtn({ children, onClick, title, className }: { children: React.ReactNode; onClick?: () => void; title?: string; className?: string }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick?.(); }}
      title={title}
      className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors text-center ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
