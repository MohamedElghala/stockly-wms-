const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log('Navigating to http://localhost:3000/login ...');
  
  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    
    // Fill login form
    console.log('Logging in...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'admin@calm.local');
    
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', 'password123');
    
    // Click submit and wait
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Navigating to /inventory ...');
    await page.goto('http://localhost:3000/inventory', { waitUntil: 'domcontentloaded' });
    
    // Wait for the table data to load
    await new Promise(r => setTimeout(r, 5000));
    
    const screenshotPath = 'C:\\Users\\Mohamed Helmy\\.gemini\\antigravity\\brain\\43eae0c4-88f6-4efb-acd7-3d1946708f4c\\inventory_page_after.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log('Screenshot saved to: ' + screenshotPath);
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
})();
