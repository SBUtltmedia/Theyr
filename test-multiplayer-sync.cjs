const puppeteer = require('puppeteer');

(async () => {
  const urlBase = 'http://localhost:53134/';
  const userA = { nick: 'Alice', id: '1001' };
  const userB = { nick: 'Bob', id: '1002' };

  console.log('🚀 Launching multiplayer sync test...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const getCounter = async (page, user) => {
    try {
        const text = await page.$eval('h3 span', el => el.innerText);
        return parseInt(text);
    } catch (e) {
        return 0;
    }
  };

  const clickIncrement = async (page) => {
    try {
        // Find button containing 'Increment Counter'
        const buttons = await page.$$('button');
        for (const button of buttons) {
            const text = await page.evaluate(el => el.innerText, button);
            if (text.includes('Increment Counter')) {
                await button.click();
                return true;
            }
        }
        return false;
    } catch (e) {
        console.error("Click error:", e);
        return false;
    }
  };

  try {
    // --- User A Setup ---
    console.log(`[Alice] Connecting...`);
    const pageA = await browser.newPage();
    pageA.setDefaultTimeout(60000);
    await pageA.goto(`${urlBase}?nick=${userA.nick}&id=${userA.id}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // Let Twine settle
    
    // Navigate A to ChatRoom
    await pageA.waitForSelector('a[data-passage="ChatRoom"]');
    await pageA.click('a[data-passage="ChatRoom"]');
    await new Promise(r => setTimeout(r, 2000));

    // --- User B Setup ---
    console.log(`[Bob] Connecting...`);
    const pageB = await browser.newPage();
    pageB.setDefaultTimeout(60000);
    await pageB.goto(`${urlBase}?nick=${userB.nick}&id=${userB.id}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // Let Twine settle

    // Navigate B to ChatRoom
    await pageB.waitForSelector('a[data-passage="ChatRoom"]');
    await pageB.click('a[data-passage="ChatRoom"]');
    await new Promise(r => setTimeout(r, 2000));

    // --- Initial Check ---
    let valA = await getCounter(pageA, 'Alice');
    let valB = await getCounter(pageB, 'Bob');
    console.log(`Initial values -> Alice: ${valA}, Bob: ${valB}`);

    // --- Action: Alice Increments ---
    console.log('[Alice] Clicking Increment...');
    await clickIncrement(pageA);
    await new Promise(r => setTimeout(r, 2000)); 

    valA = await getCounter(pageA, 'Alice');
    valB = await getCounter(pageB, 'Bob');
    console.log(`After Alice click -> Alice: ${valA}, Bob: ${valB}`);

    if (valA === valB && valA > 0) {
        console.log('✅ PASS: Synchronization verified.');
    } else {
        console.error('❌ FAIL: Values out of sync.');
    }

  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    await browser.close();
  }
})();
