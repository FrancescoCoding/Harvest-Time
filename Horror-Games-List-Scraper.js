require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require('fs').promises;
const express = require("express");

const app = express();

const harvestTime = async () => {
    console.log("Launching function...");

    const dir = './scraped';
    const targetUrl = "https://en.wikipedia.org/wiki/List_of_horror_games";
    
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
      const table = document.querySelector('table.wikitable'); // Selector for the specific table
      const rows = table.querySelectorAll('tr');

      rows.forEach((row, index) => {
          if (index === 0) return; // Skip header row
          const cells = row.querySelectorAll('td');
          let gameData = {
              title: cells[0].innerText,
              genre: cells[1].innerText,
              developerPublisher: cells[2].innerText,
              platform: cells[3].innerText,
              releaseDate: cells[4].innerText,
          };
          data.push(gameData);
      });

      return JSON.stringify(data, null, 2); // Pretty print the JSON
  });


    await browser.close();

    // Write the data to a file
    const filePath = `${dir}/horror_data.json`;
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
