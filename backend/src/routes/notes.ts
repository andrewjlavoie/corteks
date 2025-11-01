import { Router, Request, Response } from 'express';
import { noteQueries } from '../database.js';

const router = Router();

/**
 * GET /api/notes
 * Get all notes (ordered by creation date, newest first)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const notes = await noteQueries.getAll();
    res.json(notes);
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

/**
 * GET /api/notes/roots
 * Get all root notes (notes with no parent)
 */
router.get('/roots', async (req: Request, res: Response) => {
  try {
    const roots = await noteQueries.getRoots();
    res.json(roots);
  } catch (error: any) {
    console.error('Error fetching root notes:', error);
    res.status(500).json({ error: 'Failed to fetch root notes' });
  }
});

/**
 * GET /api/notes/:id
 * Get a single note by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const note = await noteQueries.getById(id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
  } catch (error: any) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

/**
 * GET /api/notes/:id/children
 * Get all child notes for a given parent note
 */
router.get('/:id/children', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First check if the parent note exists
    const parentNote = await noteQueries.getById(id);
    if (!parentNote) {
      return res.status(404).json({ error: 'Parent note not found' });
    }

    const children = await noteQueries.getChildren(id);
    res.json(children);
  } catch (error: any) {
    console.error('Error fetching child notes:', error);
    res.status(500).json({ error: 'Failed to fetch child notes' });
  }
});

/**
 * GET /api/notes/:id/tree
 * Get the complete tree structure for a note (recursive)
 */
router.get('/:id/tree', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if the root note exists
    const rootNote = await noteQueries.getById(id);
    if (!rootNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const tree = await noteQueries.getTree(id);
    res.json(tree);
  } catch (error: any) {
    console.error('Error fetching note tree:', error);
    res.status(500).json({ error: 'Failed to fetch note tree' });
  }
});

/**
 * POST /api/notes
 * Create a new note
 * Body: { parent_id?: string, content: TiptapJSON, type?: 'user' | 'ai' }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { parent_id, content, type = 'user' } = req.body;

    // Validate required fields
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Validate type
    if (type !== 'user' && type !== 'ai') {
      return res.status(400).json({ error: 'Type must be "user" or "ai"' });
    }

    // If parent_id is provided, validate it exists
    if (parent_id) {
      const parentNote = await noteQueries.getById(parent_id);
      if (!parentNote) {
        return res.status(404).json({ error: 'Parent note not found' });
      }
    }

    // Create the note
    const newNote = await noteQueries.create(
      parent_id || null,
      type,
      content,
      null, // process_type (set later when processing)
      'draft' // initial status
    );

    console.log(`✓ Created new note: ${newNote.id}`);
    res.status(201).json(newNote);
  } catch (error: any) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * PATCH /api/notes/:id
 * Update a note's content
 * Body: { content: TiptapJSON }
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Validate content
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if note exists
    const existingNote = await noteQueries.getById(id);
    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Update the note
    const updatedNote = await noteQueries.updateContent(id, content);

    console.log(`✓ Updated note: ${id}`);
    res.json(updatedNote);
  } catch (error: any) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

/**
 * DELETE /api/notes/:id
 * Delete a note (and all its children due to CASCADE)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if note exists
    const note = await noteQueries.getById(id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Delete the note (cascade will delete children)
    await noteQueries.delete(id);

    console.log(`✓ Deleted note: ${id}`);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
