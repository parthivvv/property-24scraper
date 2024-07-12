const { chromium } = require('playwright');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const userAgents = [
    // Chrome (Windows)
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",

    // Firefox (Windows)
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0",

    // Edge (Windows)
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Edg/91.0.864.59",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Edg/92.0.902.62",

    // Safari (macOS)
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
];

(async () => {
    const browser = await chromium.launch({ headless: false }); 
    const baseUrl = 'https://www.property24.com/estate-agents/eazi-real-estate/30100';
    const uniqueProfileUrls = new Set();  
    const agents = [];

    // Initial page visit to get profile URLs
    const context1 = await browser.newContext({ userAgent: getRandomUserAgent() });
    const page1 = await context1.newPage();
    await page1.goto(baseUrl);
    await page1.waitForSelector('.col-4.p24_agencyCard');
    
    const initialProfileUrls = await page1.$$eval('.col-4.p24_agencyCard a', links => links.map(link => link.href));
    for (const url of initialProfileUrls) uniqueProfileUrls.add(url);

    await context1.close();

    // Fetch agent details directly from their profile pages
    for (const profileUrl of uniqueProfileUrls) {
        const context = await browser.newContext({ userAgent: getRandomUserAgent() });
        const page = await context.newPage();
        await page.goto(profileUrl);
        await page.waitForTimeout(Math.random() * 1000 + 500); 

        try {
            const contactButton = await page.waitForSelector('a[id^="toggle-numbers-link_"]', { timeout: 20000 });
            await page.mouse.move(Math.floor(Math.random() * 11), Math.floor(Math.random() * 11)); // Move mouse to button
            await page.waitForTimeout(500);  // Short delay before clicking
            await contactButton.click();

            await page.waitForSelector('.P24_ListingContactNumbersDiv', { timeout: 20000 });
            const contactInfo = await page.$eval('.P24_ListingContactNumbersDiv', div => div.textContent.trim());

            const nameMatch = contactInfo.match(/^([^T]+)Tel:/);
            const name = nameMatch ? nameMatch[1].trim() : 'Name not found';
            const contactNumbers = contactInfo.split('Tel:').slice(1).map(n => n.trim());

            agents.push({ name, profileUrl, contactNumbers: contactNumbers.join(', ') });
        } catch (e) {
            console.error(`Failed to fetch details for ${profileUrl}: ${e.message}`);
            // Add error handling logic here if needed (e.g., retry, log to file)
        }

        await context.close(); 
        console.log(agents); // Log after each agent is processed
    }

    // Save the scraped data to a CSV file
    const csvWriter = createCsvWriter({
        path: 'agents_eazi.csv',
        header: [
            { id: 'name', title: 'Name' },
            { id: 'profileUrl', title: 'Profile URL' },
            { id: 'contactNumbers', title: 'Contact Numbers' }
        ]
    });

    await csvWriter.writeRecords(agents);
    console.log('Data saved to agents.csv');

    await browser.close();
})();

function getRandomUserAgent() {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}