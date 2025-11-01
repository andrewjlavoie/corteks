# AI Notes - E2E Testing Guide

This directory contains end-to-end (E2E) tests for the AI Notes POC using Playwright.

## Overview

The test suite validates all major user journeys:
- ✅ Note creation and editing
- ✅ AI processing with mock LLM (no API costs!)
- ✅ Tree navigation and hierarchy
- ✅ Note deletion and cascade deletes
- ✅ UI state management
- ✅ Error handling

## Mock LLM Service

**Important**: These tests use a **mock LLM service** that returns predefined responses instead of calling the real Anthropic API. This provides:

- 🎯 **Zero API costs** - No charges for testing
- ⚡ **Fast execution** - Mock responses return in ~500ms vs 5-30s for real API
- 🔄 **Consistent results** - Same mock responses every time
- 🌐 **No internet required** - Tests work offline
- 🧪 **Realistic responses** - Mock data mimics real AI output

The mock service is automatically enabled when using `docker-compose.test.yml`.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for running tests locally)

## Quick Start

### 1. Start the Test Environment

```bash
# From the root directory
cd ..

# Start services with mock LLM enabled
docker-compose -f docker-compose.test.yml up --build

# Wait for services to be ready (~30 seconds)
# You should see:
# ✓ Connected to PostgreSQL database
# 🧪 Using mock LLM service
```

### 2. Install Test Dependencies

```bash
# In a new terminal, from tests directory
cd tests
npm install

# Install Playwright browsers (first time only)
npx playwright install chromium
```

### 3. Run the Tests

```bash
# Run all tests
npm test

# Run with UI (recommended for development)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run specific test file
npx playwright test e2e/01-note-creation.spec.ts

# Run in debug mode
npm run test:debug
```

## Test Structure

```
tests/
├── e2e/
│   ├── fixtures.ts                  # Test helpers and utilities
│   ├── 01-note-creation.spec.ts     # Note CRUD operations
│   ├── 02-ai-processing.spec.ts     # AI features with mock
│   ├── 03-tree-navigation.spec.ts   # Tree UI and navigation
│   └── 04-note-deletion.spec.ts     # Delete operations
├── playwright.config.ts             # Playwright configuration
├── package.json
└── README.md                        # This file
```

## Test Cases

### 01: Note Creation & Editing (8 tests)
- ✅ Application loads correctly
- ✅ Welcome note appears on first load
- ✅ Create new notes
- ✅ Edit and save notes
- ✅ Content persists after refresh
- ✅ Note count updates correctly
- ✅ Metadata displays properly
- ✅ Handle empty notes

### 02: AI Processing (12 tests)
- ✅ Research action with mock LLM
- ✅ Summarize action
- ✅ Expand action
- ✅ Action Plan creation
- ✅ Processing indicators
- ✅ Button state during processing
- ✅ Tree structure for AI children
- ✅ Process type badges
- ✅ Prevent processing AI notes
- ✅ Multiple sequential processing
- ✅ Mock response quality

### 03: Tree Navigation (8 tests)
- ✅ Expand/collapse tree nodes
- ✅ Navigate between notes
- ✅ Hierarchical indentation
- ✅ Selection highlighting
- ✅ User vs AI note icons
- ✅ Note preview text
- ✅ Tree updates on edit
- ✅ Persistent tree state

### 04: Note Deletion (9 tests)
- ✅ Delete button on hover
- ✅ Confirm deletion dialog
- ✅ Cancel deletion
- ✅ Cascade delete children
- ✅ Clear editor on delete
- ✅ AI notes cannot be deleted directly
- ✅ Note count updates
- ✅ Multiple sequential deletes
- ✅ Empty state display

**Total: 37 tests**

## Running Tests in CI/CD

```bash
# GitHub Actions example
- name: Run E2E Tests
  run: |
    docker-compose -f docker-compose.test.yml up -d
    cd tests && npm ci
    npx playwright install --with-deps chromium
    npm test
    docker-compose -f docker-compose.test.yml down
```

## Viewing Test Results

After running tests:

```bash
# View HTML report
npm run report

# Results are saved in:
# - test-results/       # Screenshots, videos
# - playwright-report/  # HTML report
```

## Writing New Tests

Use the provided fixtures and helpers:

```typescript
import { test, expect, createNoteViaUI } from './fixtures';

test.describe('My New Feature', () => {
  test.use({ cleanDb: true }); // Clean database before each test

  test('should do something', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Use helper functions
    await createNoteViaUI(page, 'Test content');

    // Make assertions
    await expect(page.locator('text=Test content')).toBeVisible();
  });
});
```

### Available Helpers

```typescript
// Database
cleanDb                          // Fixture: clears database

// Navigation
waitForNoteInTree(page, text)    // Wait for note to appear
clickNoteInTree(page, text)      // Click note in tree

// AI Processing
processNoteWithAI(page, type)    // Trigger AI action
waitForProcessingComplete(page)  // Wait for processing

// Editor
getEditorText(page)              // Get editor content
typeInEditor(page, text)         // Type in editor
waitForSave(page)                // Wait for save

// CRUD
createNoteViaUI(page, content)   // Create note via UI
```

## Debugging Tests

### Debug Mode
```bash
npm run test:debug
```

This opens Playwright Inspector where you can:
- Step through tests
- Inspect selectors
- See network activity
- View console logs

### Screenshots and Videos

Tests automatically capture:
- Screenshots on failure
- Videos on failure
- Full trace on retry

Find them in `test-results/` directory.

### Manual Testing

Start the test environment and test manually:

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up

# Open in browser
open http://localhost:5173

# Try AI actions - they'll use mock responses!
```

## Mock LLM Details

The mock LLM service (`backend/src/services/llm-mock.ts`) returns realistic responses:

**Research**: Comprehensive summary with key concepts, context, and sources
**Summarize**: Concise bullet-point summary
**Expand**: Detailed analysis with examples and perspectives
**Action Plan**: Step-by-step plan with time estimates

Responses include:
- Proper markdown formatting
- Realistic token counts
- Simulated API delay (~500ms)
- Logged output for debugging

## Switching to Real LLM

To test with the real Anthropic API:

1. Use regular docker-compose:
   ```bash
   docker-compose up
   ```

2. Set your API key in `.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-real-key
   ```

3. Run tests normally - they'll use real API calls

**Note**: This will incur API costs (~$0.02-0.05 per test run).

## Troubleshooting

### Tests timing out

```bash
# Increase timeout in playwright.config.ts
timeout: 120 * 1000, // 2 minutes
```

### Database conflicts

```bash
# Ensure database is cleaned
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up --build
```

### Tests failing on fresh database

```bash
# Check backend logs for database errors
docker-compose -f docker-compose.test.yml logs backend

# Verify database initialized correctly
docker-compose -f docker-compose.test.yml exec postgres psql -U notesuser -d notesdb -c "\\dt"
```

### Mock LLM not working

```bash
# Check backend logs for mock confirmation
docker-compose -f docker-compose.test.yml logs backend | grep "mock"

# Should see: "🧪 Using mock LLM service"

# Verify environment variable
docker-compose -f docker-compose.test.yml exec backend env | grep USE_MOCK_LLM
# Should show: USE_MOCK_LLM=true
```

### Playwright can't find browser

```bash
# Reinstall browsers
npx playwright install chromium --with-deps
```

## Performance

Expected test run times:
- **Full suite**: ~60-90 seconds
- **Single file**: ~10-20 seconds
- **With UI mode**: ~5-10 minutes (interactive)

Mock LLM makes tests ~10x faster than using real API.

## Best Practices

1. **Always use `cleanDb` fixture** for isolation
2. **Wait for elements** before interacting
3. **Use helpers** instead of raw Playwright APIs
4. **Test user journeys**, not implementation
5. **Keep tests independent** - no shared state
6. **Use descriptive test names**
7. **Add comments** for complex scenarios

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Use mock LLM for AI features
3. Update this README with new test cases
4. Ensure all tests pass before PR
5. Add helpful comments

## Resources

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
