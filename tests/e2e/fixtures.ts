import { test as base, expect } from '@playwright/test';

/**
 * Custom fixtures and helpers for AI Notes tests
 */

// API base URL
const API_BASE = 'http://localhost:3000/api';

// Helper to clear all notes from the database
async function clearDatabase() {
  const response = await fetch(`${API_BASE}/notes`);
  const notes = await response.json();

  // Delete all root notes (cascade will handle children)
  const rootNotes = notes.filter((n: any) => !n.parent_id);

  for (const note of rootNotes) {
    await fetch(`${API_BASE}/notes/${note.id}`, {
      method: 'DELETE',
    });
  }
}

// Extended test with custom fixtures
export const test = base.extend({
  // Fixture to clear database before each test
  cleanDb: async ({}, use) => {
    await clearDatabase();
    await use();
    // Optionally clean after test too
    // await clearDatabase();
  },
});

export { expect };

// Page object models and helper functions

/**
 * Helper to wait for a note to appear in the tree
 */
export async function waitForNoteInTree(page: any, noteText: string, timeout = 10000) {
  await page.waitForSelector(
    `text=${noteText}`,
    { state: 'visible', timeout }
  );
}

/**
 * Helper to click on a note in the tree
 */
export async function clickNoteInTree(page: any, noteText: string) {
  await page.click(`text=${noteText}`);
}

/**
 * Helper to wait for AI processing to complete
 */
export async function waitForProcessingComplete(page: any, timeout = 60000) {
  // Wait for processing indicator to disappear
  await page.waitForSelector('text=Processing with AI...', {
    state: 'hidden',
    timeout,
  });

  // Wait a bit for the UI to update
  await page.waitForTimeout(1000);
}

/**
 * Helper to get editor content
 */
export async function getEditorText(page: any): Promise<string> {
  return await page.locator('.ProseMirror').innerText();
}

/**
 * Helper to type in the editor
 */
export async function typeInEditor(page: any, text: string) {
  await page.locator('.ProseMirror').click();
  await page.locator('.ProseMirror').fill(text);
}

/**
 * Helper to wait for save operation
 */
export async function waitForSave(page: any) {
  // Wait for Save button to not show "Saving..."
  await page.waitForFunction(
    () => {
      const button = document.querySelector('button:has-text("Save")');
      return button && !button.textContent?.includes('Saving...');
    },
    { timeout: 5000 }
  );
}

/**
 * Helper to create a note via UI
 */
export async function createNoteViaUI(page: any, content: string) {
  // Click New Note button
  await page.click('button:has-text("New Note")');

  // Wait for editor to be ready
  await page.waitForSelector('.ProseMirror', { state: 'visible' });

  // Type content
  await typeInEditor(page, content);

  // Save
  await page.click('button:has-text("Save")');
  await waitForSave(page);
}

/**
 * Helper to process a note with AI
 */
export async function processNoteWithAI(page: any, processType: 'Research' | 'Summarize' | 'Expand' | 'Action Plan') {
  await page.click(`button:has-text("${processType}")`);
  await waitForProcessingComplete(page);
}
