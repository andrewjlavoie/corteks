// API client for communicating with the backend

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Note {
  id: string;
  parent_id: string | null;
  type: 'user' | 'ai';
  content: any; // Tiptap JSON
  process_type: string | null;
  status: 'draft' | 'processing' | 'complete' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

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
   * Get all notes
   */
  async getNotes(): Promise<Note[]> {
    const response = await fetch(`${API_BASE}/notes`);
    return handleResponse<Note[]>(response);
  },

  /**
   * Get root notes (notes with no parent)
   */
  async getRootNotes(): Promise<Note[]> {
    const response = await fetch(`${API_BASE}/notes/roots`);
    return handleResponse<Note[]>(response);
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
};

export { ApiError };
