import { Router, Request, Response } from 'express';
import { noteQueries } from '../database.js';
import { processNote, getAvailableProcesses, ProcessType } from '../services/processor.js';

const router = Router();

/**
 * GET /api/processes
 * Get list of available AI process types
 */
router.get('/processes', (req: Request, res: Response) => {
  const processes = getAvailableProcesses();
  res.json(processes);
});

/**
 * POST /api/notes/:id/process
 * Trigger AI processing on a note
 * Body: { processType: 'research' | 'summarize' | 'expand' | 'actionplan' }
 */
router.post('/:id/process', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { processType } = req.body;

  // Validate process type
  const validTypes: ProcessType[] = ['research', 'summarize', 'expand', 'actionplan'];
  if (!processType || !validTypes.includes(processType)) {
    return res.status(400).json({
      error: 'Invalid process type',
      validTypes,
    });
  }

  try {
    // Check if note exists
    const note = await noteQueries.getById(id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Check if note is already being processed
    if (note.status === 'processing') {
      return res.status(409).json({
        error: 'Note is already being processed',
        status: note.status,
      });
    }

    console.log(`Starting ${processType} process for note ${id}`);

    // Update status to processing
    await noteQueries.updateStatus(id, 'processing', null);

    // Process the note (this calls the LLM and creates a child note)
    try {
      const childNoteId = await processNote(id, processType);

      // Update original note status to complete
      await noteQueries.updateStatus(id, 'complete', null);

      res.json({
        success: true,
        message: 'Processing complete',
        childNoteId,
        processType,
      });
    } catch (processingError: any) {
      // Update status to failed with error message
      await noteQueries.updateStatus(id, 'failed', processingError.message);

      console.error('Processing failed:', processingError);
      res.status(500).json({
        error: 'Processing failed',
        message: processingError.message,
      });
    }
  } catch (error: any) {
    console.error('Error in process endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/notes/:id/retry
 * Retry a failed processing job
 */
router.post('/:id/retry', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const note = await noteQueries.getById(id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.status !== 'failed') {
      return res.status(400).json({
        error: 'Can only retry failed notes',
        currentStatus: note.status,
      });
    }

    if (!note.process_type) {
      return res.status(400).json({
        error: 'No process type found for this note',
      });
    }

    console.log(`Retrying ${note.process_type} process for note ${id}`);

    // Reset status to processing
    await noteQueries.updateStatus(id, 'processing', null);

    try {
      const childNoteId = await processNote(id, note.process_type as ProcessType);

      // Update status to complete
      await noteQueries.updateStatus(id, 'complete', null);

      res.json({
        success: true,
        message: 'Retry successful',
        childNoteId,
        processType: note.process_type,
      });
    } catch (processingError: any) {
      // Update status back to failed
      await noteQueries.updateStatus(id, 'failed', processingError.message);

      res.status(500).json({
        error: 'Retry failed',
        message: processingError.message,
      });
    }
  } catch (error: any) {
    console.error('Error in retry endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/notes/:id/status
 * Get the processing status of a note
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const note = await noteQueries.getById(id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      id: note.id,
      status: note.status,
      process_type: note.process_type,
      error_message: note.error_message,
      updated_at: note.updated_at,
    });
  } catch (error: any) {
    console.error('Error fetching note status:', error);
    res.status(500).json({ error: 'Failed to fetch note status' });
  }
});

export default router;
