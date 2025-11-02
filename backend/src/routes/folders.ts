import express, { Request, Response } from 'express';
import { pool } from '../database.js';
import { CreateFolderRequest, UpdateFolderRequest, MoveItemRequest } from '../types/items.js';

const router = express.Router();

// Create a new folder
router.post('/', async (req: Request<{}, {}, CreateFolderRequest>, res: Response) => {
  try {
    const { name, parent_id } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    if (name.trim().length > 255) {
      return res.status(400).json({ error: 'Folder name too long (max 255 characters)' });
    }

    // Validate parent exists if provided
    if (parent_id) {
      const parentCheck = await pool.query(
        'SELECT id, item_type FROM notes WHERE id = $1',
        [parent_id]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }

      if (parentCheck.rows[0].item_type !== 'folder') {
        return res.status(400).json({ error: 'Parent must be a folder' });
      }
    }

    const result = await pool.query(
      `INSERT INTO notes (parent_id, type, item_type, name, content, status)
       VALUES ($1, 'user', 'folder', $2, NULL, 'complete')
       RETURNING *`,
      [parent_id || null, name.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Get folder contents
router.get('/:id/contents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify folder exists
    const folderCheck = await pool.query(
      'SELECT id, item_type FROM notes WHERE id = $1',
      [id]
    );

    if (folderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folderCheck.rows[0].item_type !== 'folder') {
      return res.status(400).json({ error: 'Item is not a folder' });
    }

    // Get all direct children
    const result = await pool.query(
      'SELECT * FROM notes WHERE parent_id = $1 ORDER BY item_type DESC, created_at ASC',
      [id]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error getting folder contents:', error);
    res.status(500).json({ error: 'Failed to get folder contents' });
  }
});

// Update folder (rename)
router.patch('/:id', async (req: Request<{ id: string }, {}, UpdateFolderRequest>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parent_id } = req.body;

    // Verify folder exists
    const folderCheck = await pool.query(
      'SELECT id, item_type FROM notes WHERE id = $1',
      [id]
    );

    if (folderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folderCheck.rows[0].item_type !== 'folder') {
      return res.status(400).json({ error: 'Item is not a folder' });
    }

    // Validate parent if being moved
    if (parent_id !== undefined) {
      if (parent_id === id) {
        return res.status(400).json({ error: 'Folder cannot be its own parent' });
      }

      if (parent_id) {
        const parentCheck = await pool.query(
          'SELECT id, item_type FROM notes WHERE id = $1',
          [parent_id]
        );

        if (parentCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Parent folder not found' });
        }

        if (parentCheck.rows[0].item_type !== 'folder') {
          return res.status(400).json({ error: 'Parent must be a folder' });
        }

        // Check for circular reference
        const isCircular = await checkCircularReference(id, parent_id);
        if (isCircular) {
          return res.status(400).json({ error: 'Cannot create circular folder structure' });
        }
      }
    }

    // Validate name if provided
    if (name !== undefined && name.trim() !== '' && name.trim().length > 255) {
      return res.status(400).json({ error: 'Folder name too long (max 255 characters)' });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined && name.trim() !== '') {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }

    if (parent_id !== undefined) {
      updates.push(`parent_id = $${paramCount++}`);
      values.push(parent_id || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE notes SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder and all contents
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify folder exists
    const folderCheck = await pool.query(
      'SELECT id, item_type FROM notes WHERE id = $1',
      [id]
    );

    if (folderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folderCheck.rows[0].item_type !== 'folder') {
      return res.status(400).json({ error: 'Item is not a folder' });
    }

    // Delete folder (cascade will handle children)
    await pool.query('DELETE FROM notes WHERE id = $1', [id]);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Move item to different folder
router.post('/:id/move', async (req: Request<{ id: string }, {}, MoveItemRequest>, res: Response) => {
  try {
    const { id } = req.params;
    const { parent_id } = req.body;

    // Verify item exists
    const itemCheck = await pool.query(
      'SELECT id, item_type FROM notes WHERE id = $1',
      [id]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Validate target parent
    if (parent_id) {
      if (parent_id === id) {
        return res.status(400).json({ error: 'Item cannot be its own parent' });
      }

      const parentCheck = await pool.query(
        'SELECT id, item_type FROM notes WHERE id = $1',
        [parent_id]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Target folder not found' });
      }

      if (parentCheck.rows[0].item_type !== 'folder') {
        return res.status(400).json({ error: 'Target must be a folder' });
      }

      // If moving a folder, check for circular reference
      if (itemCheck.rows[0].item_type === 'folder') {
        const isCircular = await checkCircularReference(id, parent_id);
        if (isCircular) {
          return res.status(400).json({ error: 'Cannot create circular folder structure' });
        }
      }
    }

    // Move the item
    const result = await pool.query(
      'UPDATE notes SET parent_id = $1 WHERE id = $2 RETURNING *',
      [parent_id || null, id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error moving item:', error);
    res.status(500).json({ error: 'Failed to move item' });
  }
});

// Helper function to check for circular folder references
async function checkCircularReference(
  folderId: string,
  targetParentId: string,
  maxDepth: number = 100
): Promise<boolean> {
  let currentId: string | null = targetParentId;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    if (currentId === folderId) {
      return true; // Circular reference detected
    }

    const result = await pool.query(
      'SELECT parent_id FROM notes WHERE id = $1',
      [currentId]
    );

    if (result.rows.length === 0) {
      break;
    }

    currentId = result.rows[0].parent_id;
    depth++;
  }

  // If we hit max depth, assume circular to be safe
  if (depth >= maxDepth) {
    console.error(`Circular reference check exceeded max depth (${maxDepth}) for folder ${folderId}`);
    return true;
  }

  return false;
}

export default router;
