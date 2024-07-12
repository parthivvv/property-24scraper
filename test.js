const { chromium } = require('playwright');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    const baseUrl = 'https://www.property24.com/estate-agents/quay-1-international-realty/24989';
    await page.goto(baseUrl);

    await page.waitForSelector('.col-4.p24_agencyCard');

    // Extract only the profile URLs from the initial cards
    const profileUrls = await page.$$eval('.col-4.p24_agencyCard a', links => links.map(link => link.href));

    const uniqueProfileUrls = new Set(profileUrls); // Use a Set for unique URLs
    const agents = [];
    
    // Fetch agent details directly from their profile pages
    for (const profileUrl of uniqueProfileUrls) { // Iterate over unique URLs
        await page.goto(profileUrl);

        try {
            const contactButton = await page.waitForSelector('a[id^="toggle-numbers-link_"]', { timeout: 20000 });
            await contactButton.click();

            await page.waitForSelector('.P24_ListingContactNumbersDiv', { timeout: 20000 });
            const contactInfo = await page.$eval('.P24_ListingContactNumbersDiv', div => div.textContent.trim());

            // Improved splitting logic:
            const nameMatch = contactInfo.match(/^([^T]+)Tel:/);
            const name = nameMatch ? nameMatch[1].trim() : 'Name not found';

            const contactNumbers = contactInfo.split('Tel:').slice(1).map(n => n.trim());

            agents.push({
                name,
                profileUrl,
                contactNumbers: contactNumbers.join(', ')
            });

        } catch (e) {
            console.log(`Failed to fetch contact number for agent at ${profileUrl}: ${e.message}`);
            agents.push({
                name: 'Name not found',
                profileUrl,
                contactNumbers: 'No contact number'
            });
        }
        console.log(agents);
    }
    console.log(agents);

    // Save the scraped data to a CSV file
    const csvWriter = createCsvWriter({
        path: 'agents_quay1.csv',
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
