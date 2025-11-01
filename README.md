# AI Notes - Proof of Concept

A proof-of-concept AI-powered note-taking application that allows you to create notes and process them with AI to generate research, summaries, expansions, and action plans.

## Features

✨ **Core Features:**
- 📝 Rich text note editor (powered by Tiptap)
- 🌳 Hierarchical note structure (parent-child relationships)
- 🤖 AI processing with 4 modes:
  - **Research**: Get comprehensive research with key concepts and sources
  - **Summarize**: Create concise summaries of your notes
  - **Expand**: Elaborate with examples and different perspectives
  - **Action Plan**: Turn ideas into practical step-by-step plans
- 🔄 Real-time status tracking for AI processing
- 💾 Auto-save functionality
- 🗑️ Note deletion with cascade (deletes children too)

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Tiptap** (ProseMirror) for rich text editing

### Backend
- **Node.js 20** with Express
- **TypeScript** for type safety
- **PostgreSQL 16** for data persistence
- **Anthropic Claude Sonnet 4** for AI processing

### Infrastructure
- **Docker & Docker Compose** for containerization
- **Multi-stage builds** for optimized images
- **PostgreSQL** in Alpine container
- **Nginx** for production frontend serving

## Prerequisites

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Anthropic API Key** - Get one at [console.anthropic.com](https://console.anthropic.com/)

## Quick Start

### 1. Clone and Configure

```bash
# Navigate to project directory
cd corteks

# Configure your Anthropic API key
# Edit .env file and add your API key
nano .env

# Change this line:
ANTHROPIC_API_KEY=your-api-key-here

# To your actual key:
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

### 2. Start the Application

```bash
# Build and start all services (first time may take 2-3 minutes)
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/health

### 4. Stop the Application

```bash
# If running in foreground, press Ctrl+C

# If running in background:
docker-compose down

# To also remove database data:
docker-compose down -v
```

## Usage Guide

### Creating Notes

1. Click the **"+ New Note"** button in the top-right of the sidebar
2. Start typing in the rich text editor
3. Click **"Save"** to persist your changes

### Processing Notes with AI

1. Select a user note (not an AI-generated note)
2. Click one of the AI action buttons:
   - 🔍 **Research**: Get comprehensive research
   - 📝 **Summarize**: Create a concise summary
   - 💡 **Expand**: Elaborate on ideas
   - ✅ **Action Plan**: Generate actionable steps
3. Wait 10-30 seconds for AI processing
4. The AI-generated child note will appear in the tree

### Navigating Notes

- Click on any note in the sidebar tree to view it
- AI-generated notes are marked with 🤖
- User notes are marked with 📝
- Click the arrow (▼/▶) to expand/collapse child notes

### Deleting Notes

- Hover over a user note in the tree
- Click the trash icon that appears
- Confirm deletion (this will also delete all child AI notes)

## Project Structure

```
corteks/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── index.ts        # Server entry point
│   │   ├── database.ts     # PostgreSQL connection
│   │   ├── routes/         # API routes
│   │   │   ├── notes.ts    # CRUD endpoints
│   │   │   └── process.ts  # AI processing
│   │   └── services/
│   │       ├── llm.ts      # Anthropic integration
│   │       └── processor.ts # AI prompt templates
│   ├── Dockerfile
│   └── package.json
│
├── frontend/               # React application
│   ├── src/
│   │   ├── App.tsx        # Main component
│   │   ├── components/
│   │   │   ├── NoteEditor.tsx    # Tiptap editor
│   │   │   ├── NoteTree.tsx      # Tree view
│   │   │   └── ProcessButtons.tsx # AI actions
│   │   └── lib/
│   │       └── api.ts     # API client
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── database/
│   └── init.sql           # PostgreSQL schema
│
├── docker-compose.yml     # Service orchestration
├── .env                   # Environment variables
└── README.md
```

## Development

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart a Service

```bash
docker-compose restart backend
docker-compose restart frontend
```

### Access Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U notesuser -d notesdb

# Example queries:
SELECT * FROM notes;
SELECT id, type, status, process_type FROM notes;
SELECT * FROM notes WHERE type = 'ai';
```

### Rebuild After Code Changes

```bash
# Backend changes
docker-compose up --build backend

# Frontend changes
docker-compose up --build frontend

# Rebuild everything
docker-compose down && docker-compose up --build
```

### Install New Dependencies

```bash
# Backend
docker-compose exec backend npm install <package-name>

# Frontend
docker-compose exec frontend npm install <package-name>

# Then rebuild
docker-compose up --build
```

## API Endpoints

### Notes

```
GET    /api/notes              # List all notes
GET    /api/notes/roots        # List root notes only
GET    /api/notes/:id          # Get single note
GET    /api/notes/:id/children # Get child notes
GET    /api/notes/:id/tree     # Get full tree
POST   /api/notes              # Create note
PATCH  /api/notes/:id          # Update note
DELETE /api/notes/:id          # Delete note
```

### Processing

```
POST   /api/notes/:id/process  # Process note with AI
POST   /api/notes/:id/retry    # Retry failed process
GET    /api/notes/:id/status   # Get processing status
GET    /api/processes          # List available AI processes
```

### Health

```
GET    /health                 # API health check
```

## Database Schema

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  type VARCHAR(10) CHECK(type IN ('user', 'ai')),
  content JSONB NOT NULL,
  process_type VARCHAR(50),
  status VARCHAR(20) CHECK(status IN ('draft', 'processing', 'complete', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

### Backend can't connect to database
**Problem**: Backend shows database connection errors

**Solution**:
```bash
# Wait for PostgreSQL to be ready (check logs)
docker-compose logs postgres

# Restart backend after database is healthy
docker-compose restart backend
```

### Frontend shows "Failed to fetch"
**Problem**: Frontend can't reach backend API

**Solution**:
```bash
# Check backend is running
docker-compose ps

# Check backend logs
docker-compose logs backend

# Verify API is accessible
curl http://localhost:3000/health
```

### AI processing fails
**Problem**: Notes stuck in "processing" or show errors

**Solution**:
```bash
# Check your Anthropic API key is set correctly
cat .env | grep ANTHROPIC_API_KEY

# Check backend logs for errors
docker-compose logs backend | grep -i error

# Verify API key has credits at console.anthropic.com
```

### Port conflicts
**Problem**: "Port already in use" errors

**Solution**:
```bash
# Find what's using the port
lsof -i :5173  # Frontend
lsof -i :3000  # Backend
lsof -i :5432  # PostgreSQL

# Kill the process or change ports in docker-compose.yml
```

### Database data lost after restart
**Problem**: Notes disappear when restarting

**Solution**:
```bash
# Don't use `docker-compose down -v` unless you want to clear data
# Use this instead to preserve data:
docker-compose down
docker-compose up

# To backup database:
docker-compose exec postgres pg_dump -U notesuser notesdb > backup.sql
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Your Anthropic API key |
| `DATABASE_URL` | No | Auto-set | PostgreSQL connection string |
| `PORT` | No | 3000 | Backend server port |
| `NODE_ENV` | No | development | Environment mode |
| `CORS_ORIGIN` | No | * | CORS allowed origins |

## Cost Estimation

This POC uses Anthropic Claude Sonnet 4:
- **Input**: ~$3 per million tokens
- **Output**: ~$15 per million tokens

Typical note processing:
- Average input: 500-2000 tokens (~$0.001-0.006)
- Average output: 1000-3000 tokens (~$0.015-0.045)
- **Cost per AI operation**: ~$0.02-0.05

## Limitations (POC)

This is a proof-of-concept with intentional limitations:
- ❌ No authentication (single user)
- ❌ No authorization or multi-tenancy
- ❌ No content moderation
- ❌ No rate limiting
- ❌ No pagination (all notes loaded at once)
- ❌ No search functionality
- ❌ No collaborative editing
- ❌ No offline support
- ❌ No backup/restore UI

## Future Enhancements

Potential improvements for production:
- 🔐 User authentication (Clerk, Auth0, Supabase)
- 🔄 Real-time sync via WebSockets
- 🔍 Full-text search
- 📊 Usage analytics and cost tracking
- 💳 Subscription and payment integration
- 🌐 Custom AI prompt templates
- 📤 Import/export functionality
- 🎨 Customizable themes
- 📱 Mobile responsiveness
- ⚡ Performance optimization for large note collections

## License

MIT

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Docker logs: `docker-compose logs -f`
3. Check database state: `docker-compose exec postgres psql -U notesuser -d notesdb`

## Credits

Built with:
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tiptap](https://tiptap.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Express](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Anthropic Claude](https://www.anthropic.com/)
