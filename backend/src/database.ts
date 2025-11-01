import { Pool, QueryResult } from 'pg';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection on startup
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Type definitions
export interface Note {
  id: string;
  parent_id: string | null;
  type: 'user' | 'ai';
  content: any; // JSONB stored as object
  process_type: string | null;
  status: 'draft' | 'processing' | 'complete' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Database query functions
export const noteQueries = {
  /**
   * Get all notes ordered by creation date (newest first)
   */
  async getAll(): Promise<Note[]> {
    const result: QueryResult<Note> = await pool.query(
      'SELECT * FROM notes ORDER BY created_at DESC'
    );
    return result.rows;
  },

  /**
   * Get a single note by ID
   */
  async getById(id: string): Promise<Note | null> {
    const result: QueryResult<Note> = await pool.query(
      'SELECT * FROM notes WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all child notes for a given parent ID
   */
  async getChildren(parentId: string): Promise<Note[]> {
    const result: QueryResult<Note> = await pool.query(
      'SELECT * FROM notes WHERE parent_id = $1 ORDER BY created_at ASC',
      [parentId]
    );
    return result.rows;
  },

  /**
   * Get the complete tree structure for a note (recursive)
   */
  async getTree(rootId: string): Promise<any> {
    const result = await pool.query(
      `
      WITH RECURSIVE tree AS (
        SELECT
          id, parent_id, type, content, process_type, status,
          created_at, ARRAY[id] AS path, 0 AS depth
        FROM notes
        WHERE id = $1

        UNION ALL

        SELECT
          n.id, n.parent_id, n.type, n.content, n.process_type, n.status,
          n.created_at, t.path || n.id, t.depth + 1
        FROM notes n
        INNER JOIN tree t ON n.parent_id = t.id
      )
      SELECT * FROM tree ORDER BY path
      `,
      [rootId]
    );
    return result.rows;
  },

  /**
   * Create a new note
   */
  async create(
    parentId: string | null,
    type: 'user' | 'ai',
    content: any,
    processType: string | null = null,
    status: 'draft' | 'processing' | 'complete' | 'failed' = 'draft'
  ): Promise<Note> {
    const result: QueryResult<Note> = await pool.query(
      `INSERT INTO notes (parent_id, type, content, process_type, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [parentId, type, JSON.stringify(content), processType, status]
    );
    return result.rows[0];
  },

  /**
   * Update note status and optionally set error message
   */
  async updateStatus(
    id: string,
    status: 'draft' | 'processing' | 'complete' | 'failed',
    errorMessage: string | null = null
  ): Promise<void> {
    await pool.query(
      'UPDATE notes SET status = $1, error_message = $2 WHERE id = $3',
      [status, errorMessage, id]
    );
  },

  /**
   * Update note content
   */
  async updateContent(id: string, content: any): Promise<Note> {
    const result: QueryResult<Note> = await pool.query(
      'UPDATE notes SET content = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(content), id]
    );
    return result.rows[0];
  },

  /**
   * Delete a note (will cascade to children due to FK constraint)
   */
  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM notes WHERE id = $1', [id]);
  },

  /**
   * Get root notes (notes with no parent)
   */
  async getRoots(): Promise<Note[]> {
    const result: QueryResult<Note> = await pool.query(
      'SELECT * FROM notes WHERE parent_id IS NULL ORDER BY created_at DESC'
    );
    return result.rows;
  },
};

// Export the pool for direct queries if needed
export { pool };
