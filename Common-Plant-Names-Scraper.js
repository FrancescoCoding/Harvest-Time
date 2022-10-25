require("dotenv").config();

const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

const harvestTime = async () => {
  console.log("Launching function...");

  const targetUrl =
    "https://en.wikipedia.org/wiki/List_of_plants_by_common_name";
  const browser = await puppeteer.launch({
    headless: true,
    timeout: 100000,
    slowMo: 30,
  });

  // Open browser window
  const page = await browser.newPage();

  // Go to the login page and set viewport
  await page.goto(targetUrl, { waitUntil: "networkidle2" });
  await page.setViewport({ width: 1920, height: 1080 });

  // Wait for specific element to load
  await page.waitForSelector(
    "#mw-content-text > div.mw-parser-output > ul:nth-child(5) > li:nth-child(1)"
  );

  // Work with page DOM
  const scrapedData = await page.evaluate(() => {
    console.log("Evaluating...");
    const info = document.querySelectorAll(
      "#mw-content-text > div.mw-parser-output > ul"
    );

    const items = [];

    info.forEach(item => {
      // iterate through each li element
      item.querySelectorAll("li").forEach(li => {
        // for each item take the text before - or – or \n and save it in an array
        if (
          li.innerText !== "Historical Common Names of Great Plains Plants" &&
          li.innerText !== "USDA PLANTS Database"
        ) {
          if (li.innerText.includes("(True) cinnamon")) {
            items.push("Cinnamon");
          } else {
            items.push(li.innerText.split(/-|–|\n/)[0].trim());
          }
        }
      });
    });

    // remove duplicates
    const uniqueItems = [...new Set(items)];

    // Order alphabetically
    const orderedItems = uniqueItems.sort();

    // return as json
    return JSON.stringify(orderedItems);
  });

  return scrapedData;
};

// Run scraping function and return results
app.get("/", async (req, res) => {
  const results = await harvestTime();
  res.send(`Scraping complete. Results: ${results}`);
});

// Listen for requests
app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${process.env.PORT}`);
});
