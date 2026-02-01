import { test, expect } from '@playwright/test';

test.describe('Theyr Multiplayer Demo', () => {
  test('should login and interact with the story', async ({ page }) => {
    // 1. Go to Login Page
    await page.goto('/');
    
    // We updated the title to "Theyr | Entry" in a previous step
    await expect(page).toHaveTitle(/Theyr | Entry/);

    // 2. Perform Mock Login
    // Note: I renamed #nick to #name in the HTML during simplification
    await page.fill('#name', 'TestPlayer');
    await page.selectOption('#role', 'admin');
    await page.click('button:has-text("Enter Story")');

    // 3. Verify Twine Story Loaded
    const storyContainer = page.locator('#passages');
    await expect(page.locator('h1').filter({ hasText: 'Theyr Modular Demo' })).toBeVisible();
    await expect(storyContainer).toContainText('Welcome');
    await expect(storyContainer).toContainText('TestPlayer');

    // 4. Test Name Change (th-set)
    await page.fill('input[type="text"]', 'NewNick');
    await page.click('button:has-text("Confirm Name")');
    
    // Wait for the UI to reflect the change (via liveblock)
    await expect(storyContainer).toContainText('NewNick');

    // 5. Navigate to Chat Room
    await page.click('a:has-text("Enter the Chat Room")');
    await expect(storyContainer).toContainText('Multiplayer Chat & Counter');

    // 6. Test Counter Increment
    const counterBefore = await page.locator('span[style*="color: cyan"]').textContent();
    await page.click('button:has-text("Increment Counter")');
    
    await expect(page.locator('span[style*="color: cyan"]')).not.toHaveText(counterBefore || "");
  });

  test('should handle multiple users (sync test)', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login User 1
    await page1.goto('/');
    await page1.fill('#name', 'User1');
    await page1.click('button:has-text("Enter Story")');
    await page1.click('a:has-text("Enter the Chat Room")');

    // Login User 2
    await page2.goto('/');
    await page2.fill('#name', 'User2');
    await page2.click('button:has-text("Enter Story")');
    await page2.click('a:has-text("Enter the Chat Room")');

    // User 1 increments counter
    await page1.click('button:has-text("Increment Counter")');
    
    // Give it a moment to sync over socket.io
    await page1.waitForTimeout(1000);
    const val1 = await page1.locator('span[style*="color: cyan"]').textContent();

    // User 2 should see the update
    await expect(page2.locator('span[style*="color: cyan"]')).toHaveText(val1 || "");

    await context1.close();
    await context2.close();
  });
});
