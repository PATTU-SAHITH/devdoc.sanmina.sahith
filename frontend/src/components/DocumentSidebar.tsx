import React, { useState } from 'react';
import type { DocSection, SectionType } from '../types/document';
import { 
  FileText, 
  Table, 
  Code, 
  CheckSquare, 
  ShieldCheck, 
  AlertCircle, 
  Plus, 
  Sliders, 
  Search, 
  Hash, 
  ChevronRight, 
  ListTree,
  GripVertical
} from 'lucide-react';

interface DocumentSidebarProps {
  sections: DocSection[];
  width: number;
  onResize: (width: number) => void;
  activeSectionId: string | 'metadata';
  onSelectSection: (id: string | 'metadata') => void;
  onAddSection: (level: 1 | 2 | 3, type: SectionType, title?: string) => void;
  onReorderSections: (draggedId: string, targetId: string) => void;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  sections,
  width,
  onResize,
  activeSectionId,
  onSelectSection,
  onAddSection,
  onReorderSections
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = width;

    const handleResizeMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(480, Math.max(240, startWidth + moveEvent.clientX - startX));
      onResize(nextWidth);
    };

    const handleResizeEnd = () => {
      window.removeEventListener('pointermove', handleResizeMove);
      window.removeEventListener('pointerup', handleResizeEnd);
    };

    window.addEventListener('pointermove', handleResizeMove);
    window.addEventListener('pointerup', handleResizeEnd, { once: true });
  };

  const filteredSections = sections.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSectionIcon = (type: SectionType) => {
    switch (type) {
      case 'table': return Table;
      case 'codeDiff': return Code;
      case 'testCases': return CheckSquare;
      case 'verificationMatrix': return ShieldCheck;
      case 'callout': return AlertCircle;
      default: return FileText;
    }
  };

  return (
    <aside className="relative shrink-0 bg-[var(--panel)] border-r border-[var(--border)] flex flex-col h-[calc(100vh-64px)] sticky top-16 select-none" style={{ width }}>
      <div
        role="separator"
        aria-label="Resize document outline"
        aria-orientation="vertical"
        aria-valuemin={240}
        aria-valuemax={480}
        aria-valuenow={width}
        onPointerDown={handleResizeStart}
        className="absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize bg-transparent hover:bg-[var(--accent-text)] active:bg-[var(--success)]"
      />
      <div className="p-3 border-b border-[var(--border)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text)] uppercase tracking-[0.12em] font-mono">
            <ListTree className="w-4 h-4 text-[var(--accent-text)]" />
            <span>Document Outline</span>
          </div>
          <span className="text-[9px] px-2 py-0.5 border border-[var(--border)] bg-[var(--panel)] text-[var(--text-dim)] font-mono uppercase tracking-[0.1em]">
            {sections.length} Sections
          </span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter sections..."
            className="w-full bg-[var(--panel)] border border-[var(--border)] pl-8 pr-2 py-1.5 text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-text)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          type="button"
          onClick={() => onSelectSection('metadata')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-left transition-all border ${
            activeSectionId === 'metadata'
              ? 'bg-[var(--panel-alt)] text-[var(--text)] border-l-2 border-l-[var(--accent-text)] border-[var(--border)]'
              : 'text-[var(--text-dim)] hover:bg-[var(--panel-alt)] hover:text-[var(--text)] border-transparent'
          }`}
        >
          <Sliders className="w-4 h-4 text-[var(--accent-text)]" />
          <span className="flex-1">Document Header & Metadata</span>
        </button>

        <div className="pt-2 pb-1 px-2 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-[0.12em] font-mono">
          Sections & Headings
        </div>

        {/* Section List */}
        {filteredSections.map((sec, idx) => {
          const Icon = getSectionIcon(sec.type);
          const isActive = activeSectionId === sec.id;
          const indent = sec.level === 1 ? 'pl-2' : sec.level === 2 ? 'pl-5' : 'pl-8';

          return (
            <button
              key={sec.id}
              type="button"
              draggable
              onDragStart={(event) => {
                setDraggedSectionId(sec.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', sec.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (draggedSectionId !== sec.id) setDropTargetId(sec.id);
              }}
              onDragLeave={() => setDropTargetId(null)}
              onDrop={(event) => {
                event.preventDefault();
                const draggedId = event.dataTransfer.getData('text/plain') || draggedSectionId;
                if (draggedId && draggedId !== sec.id) onReorderSections(draggedId, sec.id);
                setDraggedSectionId(null);
                setDropTargetId(null);
              }}
              onDragEnd={() => {
                setDraggedSectionId(null);
                setDropTargetId(null);
              }}
              onClick={() => onSelectSection(sec.id)}
              className={`w-full flex items-center gap-2 py-1.5 px-2.5 text-xs text-left transition-all border ${indent} ${
                isActive
                  ? 'bg-[var(--panel-alt)] text-[var(--text)] border-l-2 border-l-[var(--accent-text)] border-[var(--border)]'
                  : 'text-[var(--text-dim)] hover:bg-[var(--panel-alt)] hover:text-[var(--text)] border-transparent'
              } ${dropTargetId === sec.id ? 'border-t-2 border-[var(--accent-text)]' : ''} ${draggedSectionId === sec.id ? 'opacity-40' : ''}`}
            >
              <GripVertical className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-dim)] cursor-grab" />
              <span className={`text-[10px] font-mono ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-dim)]'}`}>
                {sec.level === 1 ? 'H1' : sec.level === 2 ? 'H2' : 'H3'}
              </span>
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-dim)]'}`} />
              <span className="flex-1 truncate">{sec.title || `Untitled Section ${idx + 1}`}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-[var(--border)] relative">
        <button
          type="button"
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] text-xs font-semibold transition-all font-mono uppercase tracking-[0.12em]"
        >
          <Plus className="w-4 h-4 text-[var(--accent-text)]" />
          <span>Insert New Section</span>
        </button>

        {addMenuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setAddMenuOpen(false)} />
            <div className="absolute bottom-16 left-3 right-3 bg-[var(--panel)] border border-[var(--border)] z-40 p-2 animate-fade-in space-y-1">
              <div className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-[0.12em] font-mono px-2 py-1">
                Choose Section Type
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddSection(1, 'richText', 'New Major Section');
                  setAddMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--panel-alt)] text-left font-medium"
              >
                <Hash className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                <span>Heading 1 (Major Section)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddSection(2, 'richText', 'New Subsection');
                  setAddMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--panel-alt)] text-left font-medium"
              >
                <Hash className="w-3.5 h-3.5 text-[var(--text-dim)]" />
                <span>Heading 2 (Subsection)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddSection(1, 'table', 'Data & Environment Table');
                  setAddMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--panel-alt)] text-left font-medium"
              >
                <Table className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                <span>Data Table</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddSection(2, 'codeDiff', 'Code Changes');
                  setAddMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--panel-alt)] text-left font-medium"
              >
                <Code className="w-3.5 h-3.5 text-[var(--text-dim)]" />
                <span>Code Block & Diff</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddSection(1, 'testCases', 'Validation & Test Cases');
                  setAddMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg text-left font-medium"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Test Case Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddSection(1, 'verificationMatrix', 'RCA vs Resolution Matrix');
                  setAddMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg text-left font-medium"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>RCA vs Resolution Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddSection(2, 'callout', 'Key Observation');
                  setAddMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg text-left font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Callout Alert Box</span>
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
