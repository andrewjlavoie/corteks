// Shared types for notes and folders

export type ItemType = 'folder' | 'note' | 'ai-note';

export type NoteStatus = 'draft' | 'processing' | 'complete' | 'failed';

export interface BaseItem {
  id: string;
  parent_id: string | null;
  item_type: ItemType;
  name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder extends BaseItem {
  item_type: 'folder';
  name: string;
  content: null;
  process_type: null;
  status: null;
  error_message: null;
}

export interface Note extends BaseItem {
  item_type: 'note';
  content: any; // Tiptap JSON
  process_type?: string | null;
  status: NoteStatus;
  error_message?: string | null;
  type: 'user'; // Legacy field
}

export interface AINote extends BaseItem {
  item_type: 'ai-note';
  content: any; // Tiptap JSON
  process_type: string;
  status: NoteStatus;
  error_message?: string | null;
  type: 'ai'; // Legacy field
}

export type Item = Folder | Note | AINote;

export interface CreateFolderRequest {
  name: string;
  parent_id?: string | null;
}

export interface UpdateFolderRequest {
  name?: string;
  parent_id?: string | null;
}

export interface CreateNoteRequest {
  content?: any;
  parent_id?: string | null;
}

export interface MoveItemRequest {
  parent_id: string | null;
}
