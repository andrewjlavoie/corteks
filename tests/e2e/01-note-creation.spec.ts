import { test, expect, createNoteViaUI, getEditorText, typeInEditor, waitForSave } from './fixtures';

test.describe('Note Creation and Editing', () => {
  test.use({ cleanDb: true });

  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1:has-text("AI Notes")')).toBeVisible();
  });

  test('should show welcome note on first load', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Wait for notes to load
    await page.waitForSelector('text=Welcome to AI Notes POC!', { timeout: 10000 });

    // Click on welcome note
    await page.click('text=Welcome to AI Notes POC!');

    // Verify editor shows the content
    await expect(page.locator('.ProseMirror')).toContainText('Welcome to AI Notes POC');
  });

  test('should create a new note', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Click New Note button
    await page.click('button:has-text("New Note")');

    // Wait for editor to appear
    await page.waitForSelector('.ProseMirror', { state: 'visible' });

    // Verify we have an empty editor
    const editorContent = await getEditorText(page);
    expect(editorContent.trim()).toBe('');

    // Verify "Your Note" header is shown
    await expect(page.locator('text=Your Note')).toBeVisible();
  });

  test('should edit and save a note', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create new note
    await page.click('button:has-text("New Note")');
    await page.waitForSelector('.ProseMirror');

    // Type content
    const noteContent = 'This is my test note with some important information.';
    await typeInEditor(page, noteContent);

    // Save
    await page.click('button:has-text("Save")');
    await waitForSave(page);

    // Verify note appears in the tree
    await expect(page.locator(`text=${noteContent.substring(0, 30)}`)).toBeVisible();
  });

  test('should persist note content after refresh', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create and save a note
    const noteContent = 'Persistent note content that should survive refresh';
    await createNoteViaUI(page, noteContent);

    // Refresh the page
    await page.reload();

    // Wait for notes to load
    await page.waitForSelector('text=notes', { timeout: 10000 });

    // Click on the note
    await page.click(`text=${noteContent.substring(0, 30)}`);

    // Verify content is still there
    const editorContent = await getEditorText(page);
    expect(editorContent).toContain(noteContent);
  });

  test('should show note count in sidebar', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Check initial count (welcome note)
    await expect(page.locator('text=/\\d+ note/')).toBeVisible();

    // Create a new note
    await createNoteViaUI(page, 'Count test note');

    // Verify count increased
    await expect(page.locator('text=/\\d+ notes/')).toBeVisible();
  });

  test('should show correct metadata for user notes', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create a note
    await createNoteViaUI(page, 'Metadata test note');

    // Click on the note in tree
    await page.click('text=Metadata test note');

    // Verify user note icon and header
    await expect(page.locator('text=Your Note')).toBeVisible();
    await expect(page.locator('text=📝')).toBeVisible();
  });

  test('should allow editing existing note content', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create initial note
    const initialContent = 'Initial content';
    await createNoteViaUI(page, initialContent);

    // Click on the note
    await page.click(`text=${initialContent}`);

    // Edit the content
    const additionalContent = ' - with additional information';
    await page.locator('.ProseMirror').click();
    await page.keyboard.press('End');
    await page.keyboard.type(additionalContent);

    // Save
    await page.click('button:has-text("Save")');
    await waitForSave(page);

    // Verify updated content
    const editorContent = await getEditorText(page);
    expect(editorContent).toContain(initialContent + additionalContent);
  });

  test('should handle empty note creation', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create note without typing anything
    await page.click('button:has-text("New Note")');
    await page.waitForSelector('.ProseMirror');

    // Save empty note
    await page.click('button:has-text("Save")');
    await waitForSave(page);

    // Verify it appears in tree (will show "Empty note")
    await expect(page.locator('text=Empty note')).toBeVisible();
  });
});
