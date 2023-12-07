require("dotenv").config();

const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

// Credentials are loaded from the environment variables
const credentials = {
  username: process.env.USER_ID,
  password: process.env.PASSWORD,
};

// Insert the DOM elements needed to trigger the function
const DOMElements = {
  username: "#Name",
  password: "#Password",
  loginButton: "#mainContentDiv > div > div > form > button",
};

const harvestTime = async (createPng = true, createPdf = false) => {
  console.log("Launching function...");

  const targetUrl = "https://timetables.rgu.ac.uk/calendar/LdapLogin";
  const browser = await puppeteer.launch({
    headless: false,
    timeout: 100000,
    slowMo: 30,
  });

  // Open browser window
  const page = await browser.newPage();

  // Go to the login page and set viewport
  await page.goto(targetUrl, { waitUntil: "networkidle2" });
  await page.setViewport({ width: 1920, height: 1080 });

  // Enter credentials
  await page.type(DOMElements.username, credentials.username);
  await page.type(DOMElements.password, credentials.password);
  await page.click(DOMElements.loginButton);

  // Wait for page to load
  await page.waitForNavigation();

  // Set month view
  await page.click(
    "#calendar > div.fc-toolbar.fc-header-toolbar > div.fc-right > div > button.fc-month-button.fc-button.fc-state-default.fc-corner-left.fc-state-active"
  );

  // Wait for page and content to load
  await page.waitForNavigation();
  // Wait for specific element to load
  await page.waitForSelector("div.fc-content");

  // Work with page DOM
  await page.evaluate(() => {
    console.log("Evaluating...");
    const info = document.querySelectorAll(".fc-content");
    const time = document.querySelectorAll("div > span.fc-time");

    // Output timetable card content
    for (let i = 0; i < time.length; i++) {
      console.log(time[i].outerText, info[i].textContent);
    }
  });

  if (createPng) {
    // Save page screenshot to .png
    await page.screenshot({ path: "page-png-printed.png" });
  }
  if (createPdf) {
    // Print page to pdf. Needs headless: true
    await page.pdf({ path: "page-pdf-printed.pdf", format: "a4" });
  }
};

// Run scraping function
harvestTime();

// Listen for requests
app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${process.env.PORT}`);
});
