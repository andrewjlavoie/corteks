import { test, expect, createNoteViaUI } from './fixtures';

test.describe('Folder Operations', () => {
  test.use({ cleanDb: true });

  test('should create a folder at root level', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Click "+ Folder" button
    await page.click('button:has-text("+ Folder")');

    // Enter folder name in prompt
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      expect(dialog.message()).toContain('folder name');
      await dialog.accept('Test Folder');
    });

    // Wait for folder to appear in tree
    await page.waitForSelector('text=📁', { timeout: 5000 });
    await expect(page.locator('text=Test Folder')).toBeVisible();
  });

  test('should display folder with folder icon', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create folder
    page.once('dialog', dialog => dialog.accept('My Documents'));
    await page.click('button:has-text("+ Folder")');

    // Wait for folder and verify icon
    await page.waitForSelector('text=📁', { timeout: 5000 });
    const folderElement = page.locator('text=My Documents').locator('..');
    await expect(folderElement.locator('text=📁')).toBeVisible();
  });

  test('should create note inside a folder', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create folder
    page.once('dialog', dialog => dialog.accept('Notes Folder'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=Notes Folder');

    // Select the folder
    await page.click('text=Notes Folder');

    // Create note
    await page.click('button:has-text("+ Note")');
    await page.waitForSelector('.ProseMirror');

    // Type content and save
    await page.locator('.ProseMirror').fill('Note inside folder');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);

    // Verify note appears under folder
    await expect(page.locator('text=Note inside folder')).toBeVisible();
  });

  test('should create nested folders', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create parent folder
    page.once('dialog', dialog => dialog.accept('Parent Folder'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=Parent Folder');

    // Select parent folder
    await page.click('text=Parent Folder');

    // Create child folder
    page.once('dialog', dialog => dialog.accept('Child Folder'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForTimeout(500);

    // Verify both folders exist
    await expect(page.locator('text=Parent Folder')).toBeVisible();
    await expect(page.locator('text=Child Folder')).toBeVisible();
  });

  test('should rename folder via double-click', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create folder
    page.once('dialog', dialog => dialog.accept('Old Name'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=Old Name');

    // Double-click to rename
    await page.locator('text=Old Name').dblclick();

    // Wait for input to appear
    await page.waitForSelector('input[value="Old Name"]');

    // Change name
    await page.locator('input[value="Old Name"]').fill('New Name');
    await page.keyboard.press('Enter');

    // Wait for update
    await page.waitForTimeout(500);

    // Verify new name
    await expect(page.locator('text=New Name')).toBeVisible();
    await expect(page.locator('text=Old Name')).not.toBeVisible();
  });

  test('should delete empty folder', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create folder
    page.once('dialog', dialog => dialog.accept('To Delete'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=To Delete');

    // Hover and click delete button
    const folderElement = page.locator('text=To Delete').locator('..');
    await folderElement.hover();

    // Accept delete confirmation
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Delete this folder');
      dialog.accept();
    });

    await folderElement.locator('button[title="Delete folder"]').click();

    // Wait for deletion
    await page.waitForTimeout(500);

    // Verify folder is gone
    await expect(page.locator('text=To Delete')).not.toBeVisible();
  });

  test('should delete folder with contents (cascade)', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create folder
    page.once('dialog', dialog => dialog.accept('Folder With Contents'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=Folder With Contents');

    // Select folder
    await page.click('text=Folder With Contents');

    // Create note inside
    await page.click('button:has-text("+ Note")');
    await page.waitForSelector('.ProseMirror');
    await page.locator('.ProseMirror').fill('Child note');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);

    // Verify note exists
    await expect(page.locator('text=Child note')).toBeVisible();

    // Delete folder
    const folderElement = page.locator('text=Folder With Contents').locator('..');
    await folderElement.hover();

    page.once('dialog', dialog => dialog.accept());
    await folderElement.locator('button[title="Delete folder"]').click();

    // Wait for deletion
    await page.waitForTimeout(500);

    // Verify both folder and note are gone
    await expect(page.locator('text=Folder With Contents')).not.toBeVisible();
    await expect(page.locator('text=Child note')).not.toBeVisible();
  });

  test('should display folders before notes in tree', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create a note first
    await createNoteViaUI(page, 'A Note');

    // Create a folder
    page.once('dialog', dialog => dialog.accept('Z Folder'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=Z Folder');

    // Get all items
    const items = await page.locator('.mb-1').allTextContents();

    // Find indices
    const folderIndex = items.findIndex(text => text.includes('Z Folder'));
    const noteIndex = items.findIndex(text => text.includes('A Note'));

    // Folder should appear before note despite alphabetical order
    expect(folderIndex).toBeLessThan(noteIndex);
  });

  test('should expand and collapse folders', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create folder with child
    page.once('dialog', dialog => dialog.accept('Collapsible'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=Collapsible');

    await page.click('text=Collapsible');
    await createNoteViaUI(page, 'Child Note');

    // Find expand/collapse button
    const folderRow = page.locator('text=Collapsible').locator('..');
    const expandButton = folderRow.locator('button').first();

    // Should be expanded by default (showing child)
    await expect(page.locator('text=Child Note')).toBeVisible();

    // Click to collapse
    await expandButton.click();
    await page.waitForTimeout(300);

    // Child should be hidden
    await expect(page.locator('text=Child Note')).not.toBeVisible();

    // Click to expand again
    await expandButton.click();
    await page.waitForTimeout(300);

    // Child should be visible
    await expect(page.locator('text=Child Note')).toBeVisible();
  });

  test('should show folder context when creating items', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create folder
    page.once('dialog', dialog => dialog.accept('Project Folder'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=Project Folder');

    // Select folder
    await page.click('text=Project Folder');

    // Verify context indicator appears
    await expect(page.locator('text=Creating in: 📁 Project Folder')).toBeVisible();

    // Create another folder - should go into selected folder
    page.once('dialog', dialog => dialog.accept('Subfolder'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForTimeout(500);

    // Expand parent folder
    await page.click('text=Project Folder');

    // Verify subfolder is nested
    await expect(page.locator('text=Subfolder')).toBeVisible();
  });

  test('should validate folder name length', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Try to create folder with very long name
    const longName = 'A'.repeat(300);

    page.once('dialog', dialog => dialog.accept(longName));
    await page.click('button:has-text("+ Folder")');

    // Should show error or truncate
    await page.waitForTimeout(500);

    // Folder should either not be created or name should be truncated
    const folderText = await page.locator('text=/^A{255,}/').count();
    expect(folderText).toBe(0); // No folder with 255+ A's
  });

  test('should handle deeply nested folder structures', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create 3 levels of nesting
    page.once('dialog', dialog => dialog.accept('Level 1'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=Level 1');

    await page.click('text=Level 1');
    page.once('dialog', dialog => dialog.accept('Level 2'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=Level 2');

    await page.click('text=Level 2');
    page.once('dialog', dialog => dialog.accept('Level 3'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=Level 3');

    // Add a note at the deepest level
    await page.click('text=Level 3');
    await createNoteViaUI(page, 'Deep Note');

    // Verify all levels are visible
    await expect(page.locator('text=Level 1')).toBeVisible();
    await expect(page.locator('text=Level 2')).toBeVisible();
    await expect(page.locator('text=Level 3')).toBeVisible();
    await expect(page.locator('text=Deep Note')).toBeVisible();
  });

  test('should maintain folder expansion state during navigation', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create folder with child note
    page.once('dialog', dialog => dialog.accept('My Folder'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForSelector('text=My Folder');

    await page.click('text=My Folder');
    await createNoteViaUI(page, 'Note 1');

    // Verify expanded
    await expect(page.locator('text=Note 1')).toBeVisible();

    // Create another note at root
    await page.click('text=items'); // Click somewhere else to deselect
    await createNoteViaUI(page, 'Root Note');

    // Folder should still be expanded
    await expect(page.locator('text=Note 1')).toBeVisible();
  });

  test('should update item count when creating folders', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Check initial count
    const initialCount = await page.locator('text=/\\d+ items?/').textContent();

    // Create a folder
    page.once('dialog', dialog => dialog.accept('Count Test'));
    await page.click('button:has-text("+ Folder")');
    await page.waitForTimeout(500);

    // Check updated count
    const updatedCount = await page.locator('text=/\\d+ items?/').textContent();

    // Count should have increased
    expect(updatedCount).not.toBe(initialCount);
  });
});
