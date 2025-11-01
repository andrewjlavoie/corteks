import { useState, useEffect, useCallback } from 'react';
import { api, Note } from './lib/api';
import { NoteEditor } from './components/NoteEditor';
import { ProcessButtons } from './components/ProcessButtons';
import { NoteTree } from './components/NoteTree';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editorContent, setEditorContent] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load all notes on mount
  const loadNotes = useCallback(async () => {
    try {
      setError(null);
      const allNotes = await api.getNotes();
      setNotes(allNotes);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to load notes:', err);
      setError(err.message || 'Failed to load notes');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Auto-refresh while processing
  useEffect(() => {
    const hasProcessingNotes = notes.some((n) => n.status === 'processing');

    if (hasProcessingNotes) {
      const interval = setInterval(loadNotes, 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    }
  }, [notes, loadNotes]);

  // Create a new note
  const handleCreateNote = async () => {
    try {
      setError(null);
      const emptyContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      };

      const newNote = await api.createNote(emptyContent);
      await loadNotes();
      setSelectedNote(newNote);
      setEditorContent(newNote.content);
    } catch (err: any) {
      console.error('Failed to create note:', err);
      setError(err.message || 'Failed to create note');
    }
  };

  // Handle note selection
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setEditorContent(note.content);
    setError(null);
  };

  // Save note content
  const handleSaveNote = async () => {
    if (!selectedNote || !editorContent) return;

    try {
      setIsSaving(true);
      setError(null);

      const updatedNote = await api.updateNote(selectedNote.id, editorContent);
      await loadNotes();

      setSelectedNote(updatedNote);
      setIsSaving(false);
    } catch (err: any) {
      console.error('Failed to save note:', err);
      setError(err.message || 'Failed to save note');
      setIsSaving(false);
    }
  };

  // Handle AI processing
  const handleProcess = async (processType: string) => {
    if (!selectedNote) return;

    try {
      setIsProcessing(true);
      setError(null);

      await api.processNote(selectedNote.id, processType);

      // Refresh notes to see the new child note
      await loadNotes();

      setIsProcessing(false);
    } catch (err: any) {
      console.error('Processing failed:', err);
      setError(err.message || 'Processing failed');
      setIsProcessing(false);
      await loadNotes(); // Still refresh to see error state
    }
  };

  // Delete a note
  const handleDeleteNote = async (id: string) => {
    try {
      setError(null);
      await api.deleteNote(id);

      // If we deleted the currently selected note, clear selection
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setEditorContent(null);
      }

      await loadNotes();
    } catch (err: any) {
      console.error('Failed to delete note:', err);
      setError(err.message || 'Failed to delete note');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Tree View */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-800">AI Notes</h1>
              <p className="text-xs text-gray-500">Proof of Concept</p>
            </div>
            <button
              onClick={handleCreateNote}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm text-sm font-medium"
            >
              + New Note
            </button>
          </div>
        </div>

        {/* Notes count */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto p-4">
          <NoteTree
            notes={notes}
            onSelectNote={handleSelectNote}
            selectedNoteId={selectedNote?.id}
            onDeleteNote={handleDeleteNote}
          />
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {selectedNote.type === 'ai' ? '🤖' : '📝'}
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {selectedNote.type === 'ai' ? 'AI Generated Note' : 'Your Note'}
                    </h2>
                    {selectedNote.process_type && (
                      <p className="text-xs text-gray-500">
                        Process: {selectedNote.process_type}
                      </p>
                    )}
                  </div>
                </div>

                {selectedNote.type === 'user' && (
                  <button
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    className={`
                      px-5 py-2 rounded-lg font-medium text-sm
                      ${
                        isSaving
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
                      }
                      transition-colors
                    `}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Processing Failed */}
              {selectedNote.status === 'failed' && selectedNote.error_message && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm">
                  <strong>Processing Failed:</strong> {selectedNote.error_message}
                </div>
              )}
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto p-6">
              <NoteEditor
                content={editorContent}
                onChange={setEditorContent}
                editable={selectedNote.type === 'user'}
                placeholder="Start writing your note..."
              />

              {/* AI Actions - Only for user notes */}
              {selectedNote.type === 'user' && (
                <div className="mt-6">
                  <ProcessButtons
                    noteId={selectedNote.id}
                    onProcess={handleProcess}
                    isProcessing={isProcessing}
                    disabled={selectedNote.status === 'processing'}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg font-medium mb-2">No note selected</p>
              <p className="text-sm">
                Select a note from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
