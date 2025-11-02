import { useState, useEffect } from 'react';
import { Item, Note, Folder } from '../lib/api';
import { ContextMenu, ContextMenuItem } from './ContextMenu';

interface NoteTreeItemProps {
  item: Item;
  children?: Item[];
  onSelect: (item: Item) => void;
  selectedId?: string;
  level?: number;
  onDelete?: (id: string, itemType: string) => void;
  onRename?: (id: string, newName: string) => void;
  autoRenameId?: string;
  onCreateNote?: (parentId: string) => void;
  onCreateFolder?: (parentId: string) => void;
  onMoveItem?: (itemId: string, newParentId: string | null) => void;
}

export function NoteTreeItem({
  item,
  children = [],
  onSelect,
  selectedId,
  level = 0,
  onDelete,
  onRename,
  autoRenameId,
  onCreateNote,
  onCreateFolder,
  onMoveItem,
}: NoteTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const hasChildren = children.length > 0;

  const isFolder = item.item_type === 'folder';
  const isSelected = selectedId === item.id;

  // Auto-trigger rename mode for newly created folders
  useEffect(() => {
    if (autoRenameId === item.id && isFolder) {
      setRenameDraft((item as Folder).name);
      setIsRenaming(true);
      setIsExpanded(true); // Ensure parent is expanded
    }
  }, [autoRenameId, item.id, isFolder, item]);

  // Extract first text from Tiptap JSON for preview
  const getPreviewText = (content: any, itemType: string): string => {
    // Folders just display their name
    if (itemType === 'folder') {
      return (item as Folder).name;
    }

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
      if (!text.trim()) return item.item_type === 'ai-note' ? 'AI Response' : 'Empty note';

      // Truncate long text
      return text.length > 60 ? text.slice(0, 60) + '...' : text;
    } catch {
      return item.item_type === 'ai-note' ? 'AI Response' : 'Note';
    }
  };

  const previewText = getPreviewText(item.content, item.item_type);

  // Status indicator (only for notes, not folders)
  const getStatusIndicator = () => {
    if (isFolder) return null;

    const note = item as Note;
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

  // No icons - cleaner Notion-like UI

  // Handle rename submission
  const handleRenameSubmit = () => {
    if (renameDraft.trim() && onRename) {
      onRename(item.id, renameDraft.trim());
    }
    setIsRenaming(false);
    setRenameDraft('');
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: item.id,
      type: item.item_type,
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Only allow dropping into folders
    if (!isFolder) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!isFolder || !onMoveItem) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const draggedItemId = data.id;

      // Prevent dropping item into itself
      if (draggedItemId === item.id) return;

      // Prevent dropping parent into its own child (would create circular reference)
      // This is a basic check - backend will do full validation
      if (item.parent_id === draggedItemId) return;

      // Move the item
      onMoveItem(draggedItemId, item.id);
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Context menu items
  const getContextMenuItems = (): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    // Folder-specific actions
    if (isFolder) {
      if (onCreateNote) {
        items.push({
          label: 'New Note',
          icon: '📄',
          onClick: () => {
            onCreateNote(item.id);
          },
        });
      }

      if (onCreateFolder) {
        items.push({
          label: 'New Folder',
          icon: '📁',
          onClick: () => {
            onCreateFolder(item.id);
          },
        });
      }

      if (items.length > 0) {
        items.push({ separator: true } as ContextMenuItem);
      }

      if (onRename) {
        items.push({
          label: 'Rename',
          icon: '✏️',
          shortcut: '⌘⇧R',
          onClick: () => {
            setRenameDraft((item as Folder).name);
            setIsRenaming(true);
          },
        });
      }
    }

    if (isFolder || item.item_type === 'note') {
      items.push({
        label: 'Duplicate',
        icon: '📋',
        shortcut: '⌘D',
        onClick: () => {
          // TODO: Implement duplicate
          console.log('Duplicate', item.id);
        },
        disabled: true,
      });

      items.push({
        label: 'Move to',
        icon: '➡️',
        shortcut: '⌘⇧P',
        onClick: () => {
          // TODO: Implement move to
          console.log('Move to', item.id);
        },
        disabled: true,
      });
    }

    if (onDelete) {
      items.push({ separator: true } as ContextMenuItem);
      items.push({
        label: isFolder ? 'Delete folder' : 'Delete note',
        icon: '🗑️',
        danger: true,
        onClick: () => {
          if (window.confirm(`Delete this ${isFolder ? 'folder' : 'note'}? This cannot be undone.`)) {
            onDelete(item.id, item.item_type);
          }
        },
      });
    }

    return items;
  };

  return (
    <div style={{ marginLeft: level * 12 }} className="mb-0.5">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          group flex items-center justify-between gap-1
          px-2 py-1.5 rounded cursor-pointer
          transition-colors duration-150
          ${
            isSelected
              ? 'bg-primary/20'
              : isDragOver
              ? 'bg-accent/50 ring-2 ring-primary/50'
              : 'hover:bg-accent/30'
          }
        `}
        onClick={() => onSelect(item)}
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Expand/collapse button */}
          {(hasChildren || isFolder) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground w-4 h-4"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}

          {/* Item preview text or rename input */}
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <input
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') {
                    setIsRenaming(false);
                    setRenameDraft('');
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-2 py-1 text-sm bg-background border border-primary rounded"
                autoFocus
              />
            ) : (
              <>
                <div
                  className={`
                    text-sm truncate
                    ${isFolder ? 'font-medium text-foreground' : ''}
                    ${item.item_type === 'ai-note' ? 'text-primary font-medium' : 'text-foreground'}
                    ${isSelected ? 'font-semibold' : ''}
                  `}
                  onDoubleClick={() => {
                    if (isFolder && onRename) {
                      setRenameDraft((item as Folder).name);
                      setIsRenaming(true);
                    }
                  }}
                >
                  {previewText}
                </div>

                {/* Process type badge */}
                {!isFolder && (item as Note).process_type && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {(item as Note).process_type}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status and actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusIndicator()}

          {/* Delete button (for user notes and folders, appears on hover) */}
          {(item.item_type === 'note' || isFolder) && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const message = isFolder
                  ? 'Delete this folder and all its contents?'
                  : 'Delete this note and all its children?';
                if (confirm(message)) {
                  onDelete(item.id, item.item_type);
                }
              }}
              className="
                opacity-0 group-hover:opacity-100
                text-destructive hover:text-destructive/80
                transition-opacity duration-150
                p-1 rounded
                hover:bg-destructive/10
              "
              title={isFolder ? 'Delete folder' : 'Delete note'}
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
              item={child}
              onSelect={onSelect}
              selectedId={selectedId}
              level={level + 1}
              onDelete={onDelete}
              onRename={onRename}
              autoRenameId={autoRenameId}
              onCreateNote={onCreateNote}
              onCreateFolder={onCreateFolder}
              onMoveItem={onMoveItem}
            />
          ))}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

// Helper component to build the tree structure from flat items list
interface NoteTreeProps {
  items: Item[];
  onSelectItem: (item: Item) => void;
  selectedItemId?: string;
  onDeleteItem?: (id: string, itemType: string) => void;
  onRenameFolder?: (id: string, newName: string) => void;
  autoRenameId?: string; // ID of folder that should auto-enter rename mode
  onCreateNote?: (parentId: string) => void;
  onCreateFolder?: (parentId: string) => void;
  onMoveItem?: (itemId: string, newParentId: string | null) => void;
}

export function NoteTree({
  items,
  onSelectItem,
  selectedItemId,
  onDeleteItem,
  onRenameFolder,
  autoRenameId,
  onCreateNote,
  onCreateFolder,
  onMoveItem,
}: NoteTreeProps) {
  // Build tree structure with full recursion
  const buildTree = () => {
    const itemMap = new Map<string, Item[]>();

    // Group items by parent_id
    items.forEach((item) => {
      const parentId = item.parent_id || 'root';
      if (!itemMap.has(parentId)) {
        itemMap.set(parentId, []);
      }
      itemMap.get(parentId)!.push(item);
    });

    // Sort items: folders first, then by creation date
    const sortItems = (items: Item[]) => {
      return items.sort((a, b) => {
        // Folders first
        if (a.item_type === 'folder' && b.item_type !== 'folder') return -1;
        if (a.item_type !== 'folder' && b.item_type === 'folder') return 1;
        // Then by created_at
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    };

    // Recursive function to build full tree with all descendants
    const buildNodeWithChildren = (itemId: string): Item[] => {
      const directChildren = itemMap.get(itemId) || [];
      return sortItems(directChildren).map(child => {
        // Recursively get all descendants
        const childrenOfChild = buildNodeWithChildren(child.id);
        return {
          ...child,
          // Store children in the item itself (needed for recursive rendering)
          _children: childrenOfChild
        } as Item & { _children?: Item[] };
      });
    };

    // Get root items (items with no parent)
    const rootItems = sortItems(itemMap.get('root') || []);

    return rootItems.map((item) => ({
      item: {
        ...item,
        _children: buildNodeWithChildren(item.id)
      } as Item & { _children?: Item[] },
      children: buildNodeWithChildren(item.id),
    }));
  };

  const tree = buildTree();

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No notes or folders yet</p>
        <p className="text-sm mt-2">Create your first note or folder to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map(({ item, children }) => (
        <NoteTreeItem
          key={item.id}
          item={item}
          children={children}
          onSelect={onSelectItem}
          selectedId={selectedItemId}
          onDelete={onDeleteItem}
          onRename={onRenameFolder}
          autoRenameId={autoRenameId}
          onCreateNote={onCreateNote}
          onCreateFolder={onCreateFolder}
          onMoveItem={onMoveItem}
        />
      ))}
    </div>
  );
}
