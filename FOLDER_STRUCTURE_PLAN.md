# Folder/File Directory Structure - Implementation Plan

## Overview
Implement Obsidian.md-style folder/file organization for notes with a hierarchical directory structure.

## Current Architecture Analysis

### Database Schema (PostgreSQL)
- `notes` table with parent_id for hierarchy
- Types: 'user' and 'ai'
- Uses JSONB for content storage
- Cascade delete on parent removal

### Current Limitations
- No concept of folders
- Only note-to-note relationships
- No way to organize notes into directories
- Cannot move notes between organizational units

## Proposed Changes

### 1. Database Schema Changes

#### Option A: Extend Existing Table (Recommended)
Add folder support to existing `notes` table:
- Add `item_type` field: 'folder', 'note', 'ai-note'
- Add `name` field for folders and file names
- Keep `content` JSONB (NULL for folders)
- Folders can contain folders and notes
- Maintain parent_id for hierarchy

**Migration:**
```sql
ALTER TABLE notes ADD COLUMN item_type VARCHAR(20) DEFAULT 'note';
ALTER TABLE notes ADD COLUMN name VARCHAR(255);
ALTER TABLE notes ADD CONSTRAINT check_item_type 
  CHECK(item_type IN ('folder', 'note', 'ai-note'));

-- Update existing data
UPDATE notes SET item_type = 'note' WHERE type = 'user';
UPDATE notes SET item_type = 'ai-note' WHERE type = 'ai';

-- Optionally drop old type column later
-- ALTER TABLE notes DROP COLUMN type;
```

#### Option B: Separate Tables
Create separate `folders` and `notes` tables:
- More normalized
- More complex joins
- Not recommended for this use case

### 2. API Changes

#### New Endpoints
- `POST /api/folders` - Create folder
- `PATCH /api/folders/:id` - Rename folder
- `DELETE /api/folders/:id` - Delete folder (and contents)
- `POST /api/notes/:id/move` - Move note to different folder
- `GET /api/folders/:id/contents` - Get folder contents

#### Modified Endpoints
- `GET /api/notes/roots` → Get root items (folders + notes)
- `POST /api/notes` - Add optional parent_folder_id
- Update tree endpoint to handle folders

### 3. Frontend Changes

#### UI Components
1. **FolderTree Component** (replace/extend NoteTree)
   - Folder icons (📁 closed, 📂 open)
   - File icons (📝 user, 🤖 AI)
   - Collapsible folders
   - Drag-and-drop support (future)
   
2. **FolderActions Component**
   - Create folder button
   - Rename folder
   - Delete folder
   - New note in folder

3. **ContextMenu Component** (right-click)
   - New note
   - New folder
   - Rename
   - Delete
   - Move to...

#### State Management
- Track expanded folders
- Current folder selection
- Breadcrumb navigation (optional)

### 4. Features Breakdown

#### Phase 1: Basic Folder Structure
- [x] Database schema migration
- [ ] Create folder API endpoint
- [ ] Update tree API to return folders
- [ ] Render folders in tree UI
- [ ] Create folder button
- [ ] Create note in folder

#### Phase 2: Folder Management
- [ ] Rename folder
- [ ] Delete folder (with confirmation)
- [ ] Move notes between folders
- [ ] Folder context menu
- [ ] Folder icons and states

#### Phase 3: Enhanced Features
- [ ] Drag-and-drop notes/folders
- [ ] Breadcrumb navigation
- [ ] Folder search/filter
- [ ] Folder metadata (note count)
- [ ] Keyboard shortcuts

### 5. Data Model

```typescript
interface Item {
  id: string;
  parent_id: string | null;
  item_type: 'folder' | 'note' | 'ai-note';
  name?: string; // For folders and file display
  content?: any; // JSONB for notes, null for folders
  process_type?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

interface Folder extends Item {
  item_type: 'folder';
  name: string;
  content: null;
}

interface Note extends Item {
  item_type: 'note' | 'ai-note';
  content: any;
}
```

### 6. UI Design Considerations

#### Sidebar Layout
```
📁 Projects
  📁 AI Research
    📝 Note 1
    📝 Note 2
    🤖 Summary
  📝 Overview
📁 Personal
  📝 Ideas
📝 Quick Notes
```

#### Folder Operations
- Single click: Select folder
- Double click: Expand/collapse
- Right click: Context menu
- Hover: Show actions (rename, delete)

### 7. Migration Strategy

#### For Existing Notes
1. Create a default "Unsorted" or "Root" folder
2. Option to organize later
3. Or leave at root level (no folder)

#### Backward Compatibility
- Keep existing parent_id relationships
- AI notes remain children of user notes
- Folders are just organizational containers

### 8. Testing Plan

- [ ] Test folder creation
- [ ] Test nested folders
- [ ] Test note creation in folders
- [ ] Test folder deletion (cascade)
- [ ] Test folder renaming
- [ ] Test moving notes
- [ ] Test AI note generation in folders
- [ ] Test tree navigation
- [ ] Test empty folder states

### 9. Technical Considerations

#### Database
- Maintain referential integrity
- Efficient queries for tree structure
- Index on parent_id and item_type

#### Performance
- Lazy load folder contents (if many items)
- Cache folder structure
- Optimize tree queries

#### User Experience
- Clear visual distinction between folders/notes
- Intuitive navigation
- Undo/redo for moves (future)
- Confirmation for destructive actions

## Implementation Order

1. **Database Migration** - Add item_type and name columns
2. **Backend API** - Folder CRUD endpoints
3. **Frontend Types** - Update TypeScript interfaces
4. **Tree Component** - Render folders
5. **Folder Actions** - Create/rename/delete UI
6. **Note Integration** - Create notes in folders
7. **Testing** - Comprehensive E2E tests
8. **Documentation** - Update README

## Questions to Answer

1. Should folders be able to have AI processing? (Probably no)
2. Should we show folder metadata (# of items)? (Yes, helpful)
3. Should we support folder templates? (Future)
4. Should we support folder colors/icons? (Future)
5. Maximum nesting depth? (Unlimited with recursion warning)

## Success Criteria

✅ Users can create folders
✅ Users can create notes inside folders
✅ Folders can contain folders (nested)
✅ Clear visual distinction between folders and notes
✅ AI notes still work as children of user notes
✅ Folder deletion removes all contents
✅ Tree navigation is intuitive
✅ All existing functionality still works
