// API client for communicating with the backend

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  type: 'user';
}

export interface Note extends BaseItem {
  item_type: 'note';
  type: 'user';
  content: any; // Tiptap JSON
  process_type: string | null;
  status: NoteStatus;
  error_message: string | null;
}

export interface AINote extends BaseItem {
  item_type: 'ai-note';
  type: 'ai';
  content: any; // Tiptap JSON
  process_type: string;
  status: NoteStatus;
  error_message: string | null;
}

export type Item = Folder | Note | AINote;

export interface ProcessResponse {
  success: boolean;
  message: string;
  childNoteId: string;
  processType: string;
}

export interface ProcessType {
  type: string;
  name: string;
  description: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || error.message || 'Request failed');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  /**
   * Get all items (notes, folders, and AI notes)
   */
  async getNotes(): Promise<Item[]> {
    const response = await fetch(`${API_BASE}/notes`);
    return handleResponse<Item[]>(response);
  },

  /**
   * Get root items (items with no parent)
   */
  async getRootNotes(): Promise<Item[]> {
    const response = await fetch(`${API_BASE}/notes/roots`);
    return handleResponse<Item[]>(response);
  },

  /**
   * Get a single note by ID
   */
  async getNote(id: string): Promise<Note> {
    const response = await fetch(`${API_BASE}/notes/${id}`);
    return handleResponse<Note>(response);
  },

  /**
   * Get all child notes for a parent
   */
  async getChildren(parentId: string): Promise<Note[]> {
    const response = await fetch(`${API_BASE}/notes/${parentId}/children`);
    return handleResponse<Note[]>(response);
  },

  /**
   * Get the complete tree structure for a note
   */
  async getTree(rootId: string): Promise<Note[]> {
    const response = await fetch(`${API_BASE}/notes/${rootId}/tree`);
    return handleResponse<Note[]>(response);
  },

  /**
   * Create a new note
   */
  async createNote(content: any, parentId?: string): Promise<Note> {
    const response = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        parent_id: parentId,
        type: 'user',
      }),
    });
    return handleResponse<Note>(response);
  },

  /**
   * Update a note's content
   */
  async updateNote(id: string, content: any): Promise<Note> {
    const response = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return handleResponse<Note>(response);
  },

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<void>(response);
  },

  /**
   * Process a note with AI
   */
  async processNote(id: string, processType: string): Promise<ProcessResponse> {
    const response = await fetch(`${API_BASE}/notes/${id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processType }),
    });
    return handleResponse<ProcessResponse>(response);
  },

  /**
   * Retry a failed processing job
   */
  async retryProcess(id: string): Promise<ProcessResponse> {
    const response = await fetch(`${API_BASE}/notes/${id}/retry`, {
      method: 'POST',
    });
    return handleResponse<ProcessResponse>(response);
  },

  /**
   * Get processing status of a note
   */
  async getStatus(id: string): Promise<{
    id: string;
    status: string;
    process_type: string | null;
    error_message: string | null;
    updated_at: string;
  }> {
    const response = await fetch(`${API_BASE}/notes/${id}/status`);
    return handleResponse(response);
  },

  /**
   * Get available AI process types
   */
  async getProcesses(): Promise<ProcessType[]> {
    const response = await fetch(`${API_BASE}/processes`);
    return handleResponse<ProcessType[]>(response);
  },

  // Folder operations

  /**
   * Create a new folder
   */
  async createFolder(name: string, parentId?: string): Promise<Folder> {
    const response = await fetch(`${API_BASE}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        parent_id: parentId,
      }),
    });
    return handleResponse<Folder>(response);
  },

  /**
   * Get contents of a folder
   */
  async getFolderContents(folderId: string): Promise<Item[]> {
    const response = await fetch(`${API_BASE}/folders/${folderId}/contents`);
    return handleResponse<Item[]>(response);
  },

  /**
   * Update/rename a folder
   */
  async updateFolder(folderId: string, name?: string, parentId?: string): Promise<Folder> {
    const response = await fetch(`${API_BASE}/folders/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        parent_id: parentId,
      }),
    });
    return handleResponse<Folder>(response);
  },

  /**
   * Delete a folder and all its contents
   */
  async deleteFolder(folderId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/folders/${folderId}`, {
      method: 'DELETE',
    });
    return handleResponse<void>(response);
  },

  /**
   * Move an item (note or folder) to a different parent
   */
  async moveItem(itemId: string, parentId: string | null): Promise<Item> {
    const response = await fetch(`${API_BASE}/folders/${itemId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_id: parentId,
      }),
    });
    return handleResponse<Item>(response);
  },
};

export { ApiError };
