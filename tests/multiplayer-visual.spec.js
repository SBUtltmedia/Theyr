import { test, expect } from '@playwright/test';

test.describe('Multiplayer Visual Demo', () => {
  test('demonstrate real-time sync between two windows', async ({ browser, baseURL }) => {
    // Create two independent browser contexts (simulating two different computers)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Print browser console logs
    page1.on('console', msg => console.log(`[BROWSER 1] ${msg.type()}: ${msg.text()}`));
    page2.on('console', msg => console.log(`[BROWSER 2] ${msg.type()}: ${msg.text()}`));

    // Helper to position windows side-by-side if supported
    // Note: Playwright doesn't have a direct "setWindowPosition" but we can resize
    await page1.setViewportSize({ width: 800, height: 800 });
    await page2.setViewportSize({ width: 800, height: 800 });

    // 1. Login User 1
    console.log("User 1 joining...");
    await page1.goto('/');
    await page1.fill('#name', 'Player_One');
    await page1.click('button:has-text("Enter Story")');
    await page1.waitForSelector('#passages');
    await page1.waitForTimeout(1000); // Slight pause to observe

    // 2. Login User 2
    console.log("User 2 joining...");
    await page2.goto('/');
    await page2.fill('#name', 'Player_Two');
    await page2.click('button:has-text("Enter Story")');
    await page2.waitForSelector('#passages');
    await page2.waitForTimeout(2000); // Pause to see both on screen

    // 3. Move both to Chat Room
    console.log("Both entering Chat Room...");
    await page1.click('a:has-text("Enter the Chat Room")');
    await page1.waitForTimeout(500);
    await page2.click('a:has-text("Enter the Chat Room")');
    await page1.waitForTimeout(1500);

    // 4. Demonstrate Sync
    console.log("Player One increments the counter...");
    const counterBefore = await page2.locator('span[style*="color: cyan"]').textContent();
    
    // Perform increment on Page 1
    await page1.click('button:has-text("Increment Counter")');
    
    // Verify Page 2 updates automatically
    await expect(page2.locator('span[style*="color: cyan"]')).not.toHaveText(counterBefore || "");
    console.log("✓ Player Two saw the update instantly!");
    await page1.waitForTimeout(2000); // Observe the counter sync

    // 5. Demonstrate Name Change Sync
    console.log("Player Two changes their name...");
    await page2.click('a:has-text("Back to Start")'); 
    await page2.waitForTimeout(1000);
    await page2.fill('input[type="text"]', 'ShinyNewName');
    await page2.waitForTimeout(500);
    await page2.click('button:has-text("Confirm Name")');
    await page2.waitForTimeout(1000);
    
    // User 1 (still in Chat Room) should see the name update if it's printed there.
    // In our current ChatRoom.twee, names aren't reactively printed in the user list yet,
    // so let's have User 1 go back to Start to see the synchronized change.
    await page1.click('a:has-text("Back to Start")');
    await expect(page1.locator('#passages')).toContainText('ShinyNewName');
    console.log("✓ Player One sees Player Two's new name!");

    // Keep windows open for a few seconds so the dev can see the result
    await page1.waitForTimeout(5000);

    await context1.close();
    await context2.close();
  });
});
