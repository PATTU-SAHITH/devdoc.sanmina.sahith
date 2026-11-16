import React from 'react';
import type { DocSection, SectionType } from '../types/document';
import { RichTextEditor } from './editors/RichTextEditor';
import { TableEditor } from './editors/TableEditor';
import { CodeDiffEditor } from './editors/CodeDiffEditor';
import { TestCasesEditor } from './editors/TestCasesEditor';
import { VerificationMatrixEditor } from './editors/VerificationMatrixEditor';
import { CalloutEditor } from './editors/CalloutEditor';
import { 
  FileText, 
  Table, 
  Code, 
  CheckSquare, 
  ShieldCheck, 
  AlertCircle, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface SectionEditorContainerProps {
  section: DocSection;
  onUpdate: (updates: Partial<DocSection>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onTriggerAi?: (text: string, onApply: (newText: string) => void) => void;
  isFirst: boolean;
  isLast: boolean;
}

export const SectionEditorContainer: React.FC<SectionEditorContainerProps> = ({
  section,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onTriggerAi,
  isFirst,
  isLast
}) => {
  const sectionTypes: { id: SectionType; label: string; icon: any }[] = [
    { id: 'richText', label: 'Rich Text / Markdown', icon: FileText },
    { id: 'table', label: 'Data Table', icon: Table },
    { id: 'codeDiff', label: 'Code & Diff', icon: Code },
    { id: 'testCases', label: 'Test Case Matrix', icon: CheckSquare },
    { id: 'verificationMatrix', label: 'RCA vs Resolution', icon: ShieldCheck },
    { id: 'callout', label: 'Callout Alert', icon: AlertCircle }
  ];

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] overflow-hidden animate-fade-in space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex items-center bg-[var(--panel)] p-1 border border-[var(--border)]">
            <button
              type="button"
              onClick={() => onUpdate({ level: 1 })}
              className={`px-2 py-0.5 text-xs font-bold ${section.level === 1 ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ level: 2 })}
              className={`px-2 py-0.5 text-xs font-bold ${section.level === 2 ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ level: 3 })}
              className={`px-2 py-0.5 text-xs font-bold ${section.level === 3 ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
            >
              H3
            </button>
          </div>

          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={section.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Section Heading Title..."
              className="w-full bg-[var(--panel)] border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] focus:outline-none focus:border-[var(--accent-text)] pr-8"
            />
            {onTriggerAi && section.title && (
              <button
                type="button"
                onClick={() => onTriggerAi(section.title, (newTitle) => onUpdate({ title: newTitle }))}
                title="AI Polish Title"
                className="absolute right-2 text-[var(--text-dim)] hover:text-[var(--text-dim)] p-0.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move Section Up"
            className="p-1.5 border border-[var(--border)] bg-[var(--panel)] text-[var(--text-dim)] disabled:opacity-40 hover:text-[var(--text)] transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            title="Move Section Down"
            className="p-1.5 border border-[var(--border)] bg-[var(--panel)] text-[var(--text-dim)] disabled:opacity-40 hover:text-[var(--text)] transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate Section"
            className="p-1.5 border border-[var(--border)] bg-[var(--panel)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete Section"
            className="p-1.5 border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 bg-[var(--panel)] p-1.5 border border-[var(--border)]">
        <span className="text-[11px] font-semibold text-[var(--text-dim)] px-2 font-mono uppercase tracking-[0.12em]">Type:</span>
        {sectionTypes.map((st) => {
          const Icon = st.icon;
          const isActive = section.type === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onUpdate({ type: st.id })}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel-alt)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Specific Editor based on section type */}
      <div className="pt-2">
        {section.type === 'richText' && (
          <RichTextEditor
            value={section.content || ''}
            onChange={(content) => onUpdate({ content })}
            onTriggerAi={onTriggerAi ? (text) => onTriggerAi(text, (newText) => onUpdate({ content: newText })) : undefined}
          />
        )}

        {section.type === 'table' && (
          <TableEditor
            tableData={section.tableData}
            onChange={(tableData) => onUpdate({ tableData })}
          />
        )}

        {section.type === 'codeDiff' && (
          <CodeDiffEditor
            codeSnippet={section.codeSnippet}
            onChange={(codeSnippet) => onUpdate({ codeSnippet })}
          />
        )}

        {section.type === 'testCases' && (
          <TestCasesEditor
            testCases={section.testCases}
            onChange={(testCases) => onUpdate({ testCases })}
          />
        )}

        {section.type === 'verificationMatrix' && (
          <VerificationMatrixEditor
            matrix={section.verificationMatrix}
            onChange={(verificationMatrix) => onUpdate({ verificationMatrix })}
          />
        )}

        {section.type === 'callout' && (
          <CalloutEditor
            callout={section.callout}
            onChange={(callout) => onUpdate({ callout })}
          />
        )}
      </div>
    </div>
  );
};
