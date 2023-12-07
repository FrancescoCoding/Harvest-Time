require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require('fs').promises;
const express = require("express");

const app = express();

const harvestTime = async () => {
    console.log("Launching function...");

    const dir = './scraped';
    const targetUrl = "https://en.wikipedia.org/wiki/List_of_years_in_literature";
    
    // Ensure the scraped directory exists
    await fs.mkdir(dir, { recursive: true }).catch(console.error);

    const browser = await puppeteer.launch({
        headless: false, // Set to false if you need to debug by seeing the browser
        timeout: 100000,
        slowMo: 30,
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle2" });
    await page.setViewport({ width: 1920, height: 1080 });
    await page.waitForSelector('#mw-content-text > div.mw-content-ltr.mw-parser-output');

    const scrapedData = await page.evaluate(() => {
      let data = [];
      const centurySections = document.querySelectorAll('#mw-content-text > div.mw-parser-output > h2');
    
      centurySections.forEach((centurySection) => {
        const era = centurySection.querySelector('.mw-headline').textContent;
        let eraData = { era, subdivisions: {} };
    
        let nextElement = centurySection.nextElementSibling;
        let currentSubdivision = '';
        while (nextElement && nextElement.tagName !== 'H2') {
          if (nextElement.tagName === 'H3') {
            currentSubdivision = nextElement.querySelector('.mw-headline').textContent;
            eraData.subdivisions[currentSubdivision] = [];
          } else if (nextElement.tagName === 'UL' && currentSubdivision) {
            const items = nextElement.querySelectorAll('li');
            items.forEach((item) => {
              const year = item.querySelector('b a') ? item.querySelector('b a').textContent : '';
              const works = Array.from(item.querySelectorAll('i')).map(work => work.textContent).join('; ');
              if(year !== '') { // Only add years that have a title
                eraData.subdivisions[currentSubdivision].push({ year, works });
              }
            });
          }
          nextElement = nextElement.nextElementSibling;
        }
    
        if (Object.keys(eraData.subdivisions).length !== 0) {
          data.push(eraData);
        }
      });
    
      return JSON.stringify(data, null, 2); // Pretty print the JSON
    });
    

    await browser.close();

    // Write the data to a file
    const filePath = `${dir}/literature_data.json`;
    try {
        await fs.writeFile(filePath, scrapedData);
        console.log(`Data saved to ${filePath}`);
        return filePath;
    } catch (error) {
        console.error("Error during scraping and saving data:", error);
        throw error; // Re-throw the error to handle it in the route
    }
};

app.get("/", async (req, res) => {
    try {
        const filePath = await harvestTime();
        res.sendFile(filePath, { root: '.' });
    } catch (error) {
        res.status(500).send("Error occurred while scraping and saving data.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
