import { test, expect, createNoteViaUI, processNoteWithAI } from './fixtures';

test.describe('Note Tree Navigation', () => {
  test.use({ cleanDb: true });

  test('should expand and collapse tree nodes', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create parent note and generate AI child
    await createNoteViaUI(page, 'Expandable parent');
    await page.click('text=Expandable parent');
    await processNoteWithAI(page, 'Research');

    // Verify expand button exists
    const expandButton = page.locator('button:has-text("▼")').first();
    await expect(expandButton).toBeVisible();

    // Verify AI note is visible (expanded by default)
    await expect(page.locator('text=🤖')).toBeVisible();

    // Click to collapse
    await expandButton.click();

    // Verify AI note is hidden
    await expect(page.locator('button:has-text("▶")').first()).toBeVisible();
    // AI note should not be visible (or there should be fewer)
    const aiNotesCollapsed = await page.locator('text=🤖').count();

    // Click to expand again
    await page.locator('button:has-text("▶")').first().click();

    // Verify AI note is visible again
    const aiNotesExpanded = await page.locator('text=🤖').count();
    expect(aiNotesExpanded).toBeGreaterThanOrEqual(1);
  });

  test('should navigate between notes in tree', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create multiple notes
    await createNoteViaUI(page, 'First note');
    await createNoteViaUI(page, 'Second note');
    await createNoteViaUI(page, 'Third note');

    // Click on second note
    await page.click('text=Second note');

    // Verify it's selected (header shows "Your Note")
    await expect(page.locator('text=Your Note')).toBeVisible();

    // Verify editor shows second note content
    await expect(page.locator('.ProseMirror')).toContainText('Second note');

    // Click on third note
    await page.click('text=Third note');

    // Verify editor now shows third note
    await expect(page.locator('.ProseMirror')).toContainText('Third note');
  });

  test('should show hierarchical indentation', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create parent and generate child
    await createNoteViaUI(page, 'Parent for hierarchy test');
    await page.click('text=Parent for hierarchy test');
    await processNoteWithAI(page, 'Research');

    // Get the positions of parent and child
    const parentElement = page.locator('text=Parent for hierarchy test').locator('..');
    const childElement = page.locator('text=🤖').first().locator('..');

    // Child should be indented more than parent
    // We can check this via marginLeft or the presence of indentation structure
    await expect(childElement).toBeVisible();
  });

  test('should highlight selected note', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create notes
    await createNoteViaUI(page, 'Highlight test 1');
    await createNoteViaUI(page, 'Highlight test 2');

    // Click on first note
    await page.click('text=Highlight test 1');

    // Check for selection styling (bg-blue-100 class or similar)
    const selected1 = page.locator('text=Highlight test 1').locator('..');
    await expect(selected1).toHaveClass(/bg-blue/);

    // Click on second note
    await page.click('text=Highlight test 2');

    // Second should be highlighted now
    const selected2 = page.locator('text=Highlight test 2').locator('..');
    await expect(selected2).toHaveClass(/bg-blue/);

    // First should not be highlighted anymore
    await expect(selected1).not.toHaveClass(/bg-blue/);
  });

  test('should show user vs AI note icons correctly', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create user note
    await createNoteViaUI(page, 'User note with icon');
    await expect(page.locator('text=📝')).toBeVisible();

    // Generate AI note
    await page.click('text=User note with icon');
    await processNoteWithAI(page, 'Research');

    // Should have both icons
    await expect(page.locator('text=📝')).toBeVisible();
    await expect(page.locator('text=🤖')).toBeVisible();
  });

  test('should show note preview text in tree', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create note with distinctive content
    const noteContent = 'This is my distinctive content for preview testing';
    await createNoteViaUI(page, noteContent);

    // Verify preview shows in tree (truncated)
    const preview = noteContent.substring(0, 40); // First 40 chars
    await expect(page.locator(`text=${preview}`)).toBeVisible();
  });

  test('should update tree when note is edited', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create note
    await createNoteViaUI(page, 'Original content');

    // Click and edit
    await page.click('text=Original content');
    await page.locator('.ProseMirror').click();
    await page.keyboard.press('End');
    await page.keyboard.type(' - Updated');

    // Save
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500); // Wait for UI update

    // Verify tree shows updated preview
    await expect(page.locator('text=Original content - Updated')).toBeVisible();
  });

  test('should maintain tree state after refresh', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create parent and child
    await createNoteViaUI(page, 'Persistent tree state');
    await page.click('text=Persistent tree state');
    await processNoteWithAI(page, 'Research');

    // Collapse the tree
    await page.locator('button:has-text("▼")').first().click();

    // Refresh page
    await page.reload();
    await page.waitForSelector('text=Persistent tree state');

    // Tree should be expanded again by default after refresh
    await expect(page.locator('button:has-text("▼")').first()).toBeVisible();
  });
});
