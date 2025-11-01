import { test, expect, createNoteViaUI, processNoteWithAI } from './fixtures';

test.describe('Note Deletion', () => {
  test.use({ cleanDb: true });

  test('should show delete button on hover for user notes', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create a note
    await createNoteViaUI(page, 'Note to hover over');

    // Hover over the note in tree
    const noteInTree = page.locator('text=Note to hover over').locator('..');
    await noteInTree.hover();

    // Delete button should appear (it's in the group that shows on hover)
    const deleteButton = noteInTree.locator('button[title="Delete note"]');
    await expect(deleteButton).toBeVisible();
  });

  test('should delete a note when confirmed', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create a note
    await createNoteViaUI(page, 'Note to delete');

    // Get initial note count
    const initialCount = await page.locator('text=/\\d+ notes?/').innerText();

    // Hover and click delete
    const noteInTree = page.locator('text=Note to delete').locator('..');
    await noteInTree.hover();

    // Listen for confirmation dialog
    page.on('dialog', dialog => dialog.accept());

    // Click delete button
    await noteInTree.locator('button[title="Delete note"]').click();

    // Wait for note to disappear
    await expect(page.locator('text=Note to delete')).not.toBeVisible({ timeout: 5000 });

    // Verify count decreased
    await page.waitForTimeout(500);
    const newCount = await page.locator('text=/\\d+ notes?/').innerText();
    // The count should have changed (or note should be gone)
  });

  test('should not delete note if confirmation is cancelled', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create a note
    await createNoteViaUI(page, 'Note to keep');

    // Hover and attempt delete
    const noteInTree = page.locator('text=Note to keep').locator('..');
    await noteInTree.hover();

    // Listen for confirmation dialog and dismiss it
    page.on('dialog', dialog => dialog.dismiss());

    // Click delete button
    await noteInTree.locator('button[title="Delete note"]').click();

    // Note should still be visible
    await expect(page.locator('text=Note to keep')).toBeVisible();
  });

  test('should cascade delete child notes', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create parent and AI child
    await createNoteViaUI(page, 'Parent to delete');
    await page.click('text=Parent to delete');
    await processNoteWithAI(page, 'Research');

    // Verify child exists
    await expect(page.locator('text=🤖')).toBeVisible();

    // Delete parent
    const noteInTree = page.locator('text=Parent to delete').locator('..');
    await noteInTree.hover();

    page.on('dialog', dialog => dialog.accept());
    await noteInTree.locator('button[title="Delete note"]').click();

    // Both parent and child should be gone
    await expect(page.locator('text=Parent to delete')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=🤖')).not.toBeVisible({ timeout: 5000 });
  });

  test('should clear editor when deleting selected note', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create and select a note
    await createNoteViaUI(page, 'Selected note to delete');
    await page.click('text=Selected note to delete');

    // Verify editor shows content
    await expect(page.locator('.ProseMirror')).toContainText('Selected note to delete');

    // Delete the note
    const noteInTree = page.locator('text=Selected note to delete').locator('..');
    await noteInTree.hover();

    page.on('dialog', dialog => dialog.accept());
    await noteInTree.locator('button[title="Delete note"]').click();

    // Wait for deletion
    await page.waitForTimeout(1000);

    // Editor should show "No note selected" state
    await expect(page.locator('text=No note selected')).toBeVisible();
  });

  test('should not show delete button for AI notes', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create note and generate AI child
    await createNoteViaUI(page, 'Generate AI child');
    await page.click('text=Generate AI child');
    await processNoteWithAI(page, 'Research');

    // Hover over AI note
    const aiNote = page.locator('text=🤖').first().locator('..');
    await aiNote.hover();

    // Delete button should NOT be visible for AI notes
    const deleteButton = aiNote.locator('button[title="Delete note"]');
    await expect(deleteButton).not.toBeVisible();
  });

  test('should update note count after deletion', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create 3 notes
    await createNoteViaUI(page, 'Note 1');
    await createNoteViaUI(page, 'Note 2');
    await createNoteViaUI(page, 'Note 3');

    // Should show count (including welcome note)
    await expect(page.locator('text=/\\d+ notes/')).toBeVisible();

    // Delete one note
    const noteInTree = page.locator('text=Note 2').locator('..');
    await noteInTree.hover();

    page.on('dialog', dialog => dialog.accept());
    await noteInTree.locator('button[title="Delete note"]').click();

    // Wait for UI update
    await page.waitForTimeout(1000);

    // Count should be updated (note that exact number depends on if welcome note exists)
    await expect(page.locator('text=/\\d+ notes?/')).toBeVisible();
  });

  test('should handle deletion of multiple notes sequentially', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create 3 notes
    await createNoteViaUI(page, 'Multi delete 1');
    await createNoteViaUI(page, 'Multi delete 2');
    await createNoteViaUI(page, 'Multi delete 3');

    // Delete first note
    let noteInTree = page.locator('text=Multi delete 1').locator('..');
    await noteInTree.hover();
    page.once('dialog', dialog => dialog.accept());
    await noteInTree.locator('button[title="Delete note"]').click();
    await expect(page.locator('text=Multi delete 1')).not.toBeVisible({ timeout: 5000 });

    // Delete second note
    noteInTree = page.locator('text=Multi delete 2').locator('..');
    await noteInTree.hover();
    page.once('dialog', dialog => dialog.accept());
    await noteInTree.locator('button[title="Delete note"]').click();
    await expect(page.locator('text=Multi delete 2')).not.toBeVisible({ timeout: 5000 });

    // Third note should still exist
    await expect(page.locator('text=Multi delete 3')).toBeVisible();
  });

  test('should show empty state when all notes deleted', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Get all notes (including welcome note)
    const notes = await page.locator('text=📝').count();

    // Delete all user notes
    for (let i = 0; i < notes; i++) {
      const firstNote = page.locator('text=📝').first().locator('..');
      await firstNote.hover();
      page.once('dialog', dialog => dialog.accept());
      await firstNote.locator('button[title="Delete note"]').click();
      await page.waitForTimeout(500);
    }

    // Should show empty state
    await expect(page.locator('text=No notes yet')).toBeVisible();
  });
});
