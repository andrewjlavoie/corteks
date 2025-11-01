import { test, expect, createNoteViaUI, processNoteWithAI, waitForProcessingComplete } from './fixtures';

test.describe('AI Processing (Mock LLM)', () => {
  test.use({ cleanDb: true });

  test('should process note with Research action', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create a note
    const noteContent = 'Explain quantum computing basics';
    await createNoteViaUI(page, noteContent);

    // Select the note
    await page.click(`text=${noteContent}`);

    // Click Research button
    await page.click('button:has-text("Research")');

    // Wait for processing to complete
    await waitForProcessingComplete(page);

    // Verify AI-generated child note appears
    await expect(page.locator('text=🤖')).toBeVisible();
    await expect(page.locator('text=Research Summary')).toBeVisible();
  });

  test('should process note with Summarize action', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create a longer note
    const noteContent = 'This is a long note with multiple points. Point one is about testing. Point two is about AI. Point three is about integration.';
    await createNoteViaUI(page, noteContent);

    // Select and process
    await page.click(`text=${noteContent.substring(0, 30)}`);
    await processNoteWithAI(page, 'Summarize');

    // Verify summary child note
    await expect(page.locator('text=Summary')).toBeVisible();
  });

  test('should process note with Expand action', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create a brief note
    const noteContent = 'Mock services in testing';
    await createNoteViaUI(page, noteContent);

    // Select and expand
    await page.click(`text=${noteContent}`);
    await processNoteWithAI(page, 'Expand');

    // Verify expanded content
    await expect(page.locator('text=Expanded Analysis')).toBeVisible();
  });

  test('should process note with Action Plan action', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create a goal note
    const noteContent = 'Implement comprehensive testing';
    await createNoteViaUI(page, noteContent);

    // Select and create action plan
    await page.click(`text=${noteContent}`);
    await processNoteWithAI(page, 'Action Plan');

    // Verify action plan created
    await expect(page.locator('text=Action Plan')).toBeVisible();
    await expect(page.locator('text=Action Steps')).toBeVisible();
  });

  test('should show processing indicator while AI is working', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create and select a note
    await createNoteViaUI(page, 'Test processing indicator');
    await page.click('text=Test processing indicator');

    // Click Research button
    await page.click('button:has-text("Research")');

    // Verify processing indicator appears
    await expect(page.locator('text=Processing with AI...')).toBeVisible();

    // Wait for it to complete
    await waitForProcessingComplete(page);

    // Verify indicator is gone
    await expect(page.locator('text=Processing with AI...')).not.toBeVisible();
  });

  test('should disable AI buttons while processing', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create and select note
    await createNoteViaUI(page, 'Button disable test');
    await page.click('text=Button disable test');

    // Start processing
    await page.click('button:has-text("Research")');

    // Check that all AI buttons are disabled
    const researchButton = page.locator('button:has-text("Research")');
    await expect(researchButton).toBeDisabled();

    const summarizeButton = page.locator('button:has-text("Summarize")');
    await expect(summarizeButton).toBeDisabled();

    // Wait for completion
    await waitForProcessingComplete(page);

    // Buttons should be enabled again
    await expect(researchButton).toBeEnabled();
  });

  test('should create child note in tree structure', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create parent note
    const parentContent = 'Parent note for tree test';
    await createNoteViaUI(page, parentContent);
    await page.click(`text=${parentContent}`);

    // Process it
    await processNoteWithAI(page, 'Research');

    // Verify parent has expand arrow
    const parentNode = page.locator(`text=${parentContent}`).locator('..');
    await expect(parentNode.locator('button:has-text("▼")')).toBeVisible();

    // Click on AI child note
    await page.click('text=🤖');

    // Verify it shows as AI Generated Note
    await expect(page.locator('text=AI Generated Note')).toBeVisible();
  });

  test('should show process type badge on AI notes', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create and process
    await createNoteViaUI(page, 'Process type test');
    await page.click('text=Process type test');
    await processNoteWithAI(page, 'Research');

    // Click on AI note
    await page.click('text=🤖');

    // Verify process type is displayed
    await expect(page.locator('text=research')).toBeVisible();
  });

  test('should not allow processing AI-generated notes', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create and process a note
    await createNoteViaUI(page, 'Generate AI note');
    await page.click('text=Generate AI note');
    await processNoteWithAI(page, 'Research');

    // Click on the AI-generated note
    await page.click('text=🤖');

    // Verify AI action buttons are NOT visible
    await expect(page.locator('button:has-text("Research")')).not.toBeVisible();
    await expect(page.locator('text=AI Actions')).not.toBeVisible();
  });

  test('should handle multiple sequential AI processing', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create a note
    await createNoteViaUI(page, 'Multiple processing test');
    await page.click('text=Multiple processing test');

    // Process with Research
    await processNoteWithAI(page, 'Research');

    // Verify first AI note created
    await expect(page.locator('text=Research Summary')).toBeVisible();

    // Process same note with Summarize
    await page.click('text=Multiple processing test');
    await processNoteWithAI(page, 'Summarize');

    // Verify second AI note created
    await expect(page.locator('text=Summary')).toBeVisible();

    // Should now have 2 AI children
    const aiNotes = page.locator('text=🤖');
    await expect(aiNotes).toHaveCount(2);
  });

  test('should show AI responses are realistic', async ({ page, cleanDb }) => {
    await page.goto('/');

    // Create and process
    await createNoteViaUI(page, 'Check mock quality');
    await page.click('text=Check mock quality');
    await processNoteWithAI(page, 'Research');

    // Click on AI note to view content
    await page.click('text=🤖');

    // Verify mock response contains expected sections
    await expect(page.locator('text=Key Concepts')).toBeVisible();
    await expect(page.locator('text=Important Context')).toBeVisible();
    await expect(page.locator('text=Related Topics')).toBeVisible();
  });
});
