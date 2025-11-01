import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import notesRouter from './routes/notes.js';
import processRouter from './routes/process.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'ANTHROPIC_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/notes', notesRouter);
app.use('/api/notes', processRouter); // Process routes are mounted under /api/notes/:id/process
app.use('/api', processRouter); // Also mount /api/processes

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'AI Notes API',
    version: '1.0.0',
    description: 'Backend API for AI-powered note-taking application',
    endpoints: {
      health: '/health',
      notes: '/api/notes',
      processes: '/api/processes',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║     AI Notes Backend API Server       ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: Connected to PostgreSQL`);
  console.log(`🤖 LLM Provider: Anthropic Claude`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /health              - Health check`);
  console.log(`  GET  /api/notes           - List all notes`);
  console.log(`  GET  /api/notes/roots     - List root notes`);
  console.log(`  GET  /api/notes/:id       - Get note by ID`);
  console.log(`  POST /api/notes           - Create new note`);
  console.log(`  PATCH /api/notes/:id      - Update note`);
  console.log(`  DELETE /api/notes/:id     - Delete note`);
  console.log(`  GET  /api/notes/:id/children - Get child notes`);
  console.log(`  GET  /api/notes/:id/tree  - Get note tree`);
  console.log(`  POST /api/notes/:id/process - Process note with AI`);
  console.log(`  GET  /api/processes       - List available AI processes`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
