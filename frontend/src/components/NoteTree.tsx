import { useState } from 'react';
import { Note } from '../lib/api';

interface NoteTreeItemProps {
  note: Note;
  children?: Note[];
  onSelect: (note: Note) => void;
  selectedId?: string;
  level?: number;
  onDelete?: (id: string) => void;
}

export function NoteTreeItem({
  note,
  children = [],
  onSelect,
  selectedId,
  level = 0,
  onDelete,
}: NoteTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = children.length > 0;

  // Extract first text from Tiptap JSON for preview
  const getPreviewText = (content: any): string => {
    try {
      if (typeof content === 'string') {
        content = JSON.parse(content);
      }

      // Recursively find first text node
      const findFirstText = (node: any): string => {
        if (node.text) {
          return node.text;
        }
        if (node.content && Array.isArray(node.content)) {
          for (const child of node.content) {
            const text = findFirstText(child);
            if (text) return text;
          }
        }
        return '';
      };

      const text = findFirstText(content);
      if (!text.trim()) return note.type === 'ai' ? 'AI Response' : 'Empty note';

      // Truncate long text
      return text.length > 60 ? text.slice(0, 60) + '...' : text;
    } catch {
      return note.type === 'ai' ? 'AI Response' : 'Note';
    }
  };

  const previewText = getPreviewText(note.content);
  const isSelected = selectedId === note.id;

  // Status indicator
  const getStatusIndicator = () => {
    switch (note.status) {
      case 'processing':
        return (
          <span className="text-xs text-orange-400 flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Processing...
          </span>
        );
      case 'failed':
        return <span className="text-xs text-red-400">⚠ Failed</span>;
      default:
        return null;
    }
  };

  return (
    <div style={{ marginLeft: level * 16 }} className="mb-1">
      <div
        className={`
          group flex items-center justify-between gap-2
          px-3 py-2 rounded-lg cursor-pointer
          transition-colors duration-150
          ${
            isSelected
              ? 'bg-purple-900/40 border border-purple-700/60'
              : 'hover:bg-amethyst-accent/30 border border-transparent'
          }
        `}
        onClick={() => onSelect(note)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Expand/collapse button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex-shrink-0 text-amethyst-text-muted hover:text-amethyst-text w-4 h-4"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}

          {/* Note icon */}
          <span className="flex-shrink-0 text-base">
            {note.type === 'ai' ? '🤖' : '📝'}
          </span>

          {/* Note preview text */}
          <div className="flex-1 min-w-0">
            <div
              className={`
                text-sm truncate
                ${note.type === 'ai' ? 'text-purple-400 font-medium' : 'text-amethyst-text'}
                ${isSelected ? 'font-semibold' : ''}
              `}
            >
              {previewText}
            </div>

            {/* Process type badge */}
            {note.process_type && (
              <div className="text-xs text-amethyst-text-muted mt-0.5">
                {note.process_type}
              </div>
            )}
          </div>
        </div>

        {/* Status and actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusIndicator()}

          {/* Delete button (only for user notes, appears on hover) */}
          {note.type === 'user' && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this note and all its children?')) {
                  onDelete(note.id);
                }
              }}
              className="
                opacity-0 group-hover:opacity-100
                text-red-400 hover:text-red-300
                transition-opacity duration-150
                p-1 rounded
                hover:bg-red-900/30
              "
              title="Delete note"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Render children recursively */}
      {isExpanded && hasChildren && (
        <div className="mt-1">
          {children.map((child) => (
            <NoteTreeItem
              key={child.id}
              note={child}
              onSelect={onSelect}
              selectedId={selectedId}
              level={level + 1}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper component to build the tree structure from flat notes list
interface NoteTreeProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  selectedNoteId?: string;
  onDeleteNote?: (id: string) => void;
}

export function NoteTree({
  notes,
  onSelectNote,
  selectedNoteId,
  onDeleteNote,
}: NoteTreeProps) {
  // Build tree structure
  const buildTree = () => {
    const noteMap = new Map<string, Note[]>();

    // Group notes by parent_id
    notes.forEach((note) => {
      const parentId = note.parent_id || 'root';
      if (!noteMap.has(parentId)) {
        noteMap.set(parentId, []);
      }
      noteMap.get(parentId)!.push(note);
    });

    // Get root notes (notes with no parent)
    const rootNotes = noteMap.get('root') || [];

    // Recursive function to get children
    const getChildren = (noteId: string): Note[] => {
      return noteMap.get(noteId) || [];
    };

    return rootNotes.map((note) => ({
      note,
      children: getChildren(note.id),
    }));
  };

  const tree = buildTree();

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-amethyst-text-muted">
        <p>No notes yet</p>
        <p className="text-sm mt-2">Create your first note to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map(({ note, children }) => (
        <NoteTreeItem
          key={note.id}
          note={note}
          children={children}
          onSelect={onSelectNote}
          selectedId={selectedNoteId}
          onDelete={onDeleteNote}
        />
      ))}
    </div>
  );
}
