const { chromium } = require('playwright');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: false });  // Launch browser in non-headless mode
    const page = await browser.newPage();

    // Replace with the actual URL
    const baseUrl = 'https://www.property24.com/estate-agents/pam-golding-properties-southern-suburbs/11117';
    await page.goto(baseUrl);

    // Wait for the page to load and display the agents
    await page.waitForSelector('.col-4.p24_agencyCard');

    // Scrape the agent details
    const agents = await page.$$eval('.col-4.p24_agencyCard', cards => {
        return cards.map(card => {
            const nameElement = card.querySelector('a');
            const name = nameElement.textContent.trim();
            const profileUrl = nameElement.href;

            return { name, profileUrl };
        });
    });

    // Fetch contact numbers for each agent
    for (const agent of agents) {
        await page.goto(agent.profileUrl);

        try {
            // Increase the timeout to 20 seconds for the contact number button to be clickable and click it
            const contactButton = await page.waitForSelector('a[id^="toggle-numbers-link_"]', { timeout: 20000 });
            await contactButton.click();

            // Wait for the contact number to appear and extract it
            await page.waitForSelector('.P24_ListingContactNumbersDiv', { timeout: 20000 });
            const contactNumbers = await page.$$eval('.P24_ListingContactNumbersDiv .js_LazyContactNumber div', numbers => {
                return numbers.map(number => number.textContent.trim());
            });
            agent.contactNumbers = contactNumbers.join(', ');
        } catch (e) {
            console.log(`Failed to fetch contact number for ${agent.name}: ${e.message}`);
            agent.contactNumbers = 'No contact number';
        }
    }

    console.log(agents);

    // Save the scraped data to a CSV file
    const csvWriter = createCsvWriter({
        path: 'agents.csv',
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
