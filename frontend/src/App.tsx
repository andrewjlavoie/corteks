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
  const [selectedAiNote, setSelectedAiNote] = useState<Note | null>(null);

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

  // Get AI children of a note
  const getAiChildren = (parentId: string) => {
    return notes.filter((n) => n.parent_id === parentId && n.type === 'ai');
  };

  // Handle note selection
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setEditorContent(note.content);
    setError(null);

    // If selecting a user note, automatically select its first AI child for side-by-side view
    if (note.type === 'user') {
      const aiChildren = getAiChildren(note.id);
      setSelectedAiNote(aiChildren.length > 0 ? aiChildren[0] : null);
    } else {
      // If selecting an AI note, show it in the right panel and find its parent
      const parent = notes.find((n) => n.id === note.parent_id);
      if (parent) {
        setSelectedNote(parent);
        setEditorContent(parent.content);
        setSelectedAiNote(note);
      }
    }
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

      // After refresh, automatically select the newly created AI child
      setTimeout(() => {
        const aiChildren = notes.filter(
          (n) => n.parent_id === selectedNote.id && n.type === 'ai'
        );
        if (aiChildren.length > 0) {
          setSelectedAiNote(aiChildren[aiChildren.length - 1]); // Select the latest one
        }
      }, 100);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Tree View */}
      <div className="w-1/3 bg-card border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Notes</h1>
              <p className="text-xs text-muted-foreground">Proof of Concept</p>
            </div>
            <button
              onClick={handleCreateNote}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm text-sm font-medium"
            >
              + New Note
            </button>
          </div>
        </div>

        {/* Notes count */}
        <div className="px-4 py-2 bg-muted border-b border-border text-xs text-muted-foreground">
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

      {/* Main Content Area - Side by Side */}
      <div className="flex-1 flex overflow-hidden">
        {selectedNote ? (
          <>
            {/* Left Panel - User Note */}
            <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 bg-card border-b border-border">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Your Note
                      </h2>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    className={`
                      px-5 py-2 rounded-lg font-medium text-sm
                      ${
                        isSaving
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm'
                      }
                      transition-all
                    `}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                    <strong>Error:</strong> {error}
                  </div>
                )}
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-y-auto p-6 bg-background">
                <NoteEditor
                  content={editorContent}
                  onChange={setEditorContent}
                  editable={true}
                  placeholder="Start writing your note..."
                />

                {/* AI Actions */}
                <div className="mt-6">
                  <ProcessButtons
                    noteId={selectedNote.id}
                    onProcess={handleProcess}
                    isProcessing={isProcessing}
                    disabled={selectedNote.status === 'processing'}
                  />
                </div>
              </div>
            </div>

            {/* Right Panel - AI Note */}
            {selectedAiNote ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-card border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        AI Generated Note
                      </h2>
                      {selectedAiNote.process_type && (
                        <p className="text-xs text-muted-foreground">
                          Process: {selectedAiNote.process_type}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Processing Failed */}
                  {selectedAiNote.status === 'failed' && selectedAiNote.error_message && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                      <strong>Processing Failed:</strong> {selectedAiNote.error_message}
                    </div>
                  )}
                </div>

                {/* AI Note Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-background">
                  <NoteEditor
                    content={selectedAiNote.content}
                    onChange={() => {}}
                    editable={false}
                    placeholder=""
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
                <div className="text-center">
                  <div className="text-6xl mb-4">🤖</div>
                  <p className="text-lg font-medium mb-2 text-foreground">No AI note yet</p>
                  <p className="text-sm">
                    Use the AI actions on the left to generate insights
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg font-medium mb-2 text-foreground">No note selected</p>
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
