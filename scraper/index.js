/*****************************************************
 * IMPORTS & SETUP
 *****************************************************/
import express from 'express';
import bodyParser from 'body-parser';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { getDB, initializeDB } from "./managers/database/mongodbManager.js";
import dotenv from 'dotenv';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config(); // Load environment variables from .env file

puppeteer.use(StealthPlugin());

const app = express();
const port = 6000;

// Path to store cookies
const COOKIES_PATH = path.join(__dirname, 'cookies.json');

initializeDB();

app.use(bodyParser.json());

/*****************************************************
 * AUTHENTICATION HELPER FUNCTION
 *****************************************************/
/**
 * Perform login on X if required.
 * This function clicks the "Next" button before entering the password.
 *
 * @param {object} page - Puppeteer Page object.
 * @param {string} email - Email or username for login.
 * @param {string} password - Password for login.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function performLogin(page, email, password) {
  try {
    console.log('Navigating to X login page...');

    // Replace with the actual login URL if different
    const loginUrl = 'https://x.com/login';
    await page.goto(loginUrl, { waitUntil: 'networkidle2' });

    // 1. Wait for the login email/username field
    await page.waitForSelector('input[name="text"]', { timeout: 10000 });
    // 2. Type the email/username
    await page.type('input[name="text"]', email, { delay: 100 });

    /******************************************************
     * CLICK THE "Next" BUTTON BEFORE ENTERING PASSWORD
     ******************************************************/
    console.log('Attempting to click the "Next" button...');
    // Use page.evaluate to find and click the "Next" button based on its visible text
    const nextClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[role="button"]'));
      const nextButton = buttons.find(btn => btn.innerText.trim() === 'Next');
      if (nextButton) {
        nextButton.click();
        return true;
      }
      return false;
    });

    if (nextClicked) {
      console.log('Clicked the "Next" button.');
    } else {
      console.warn('Could not find the "Next" button. Taking a screenshot for debugging.');
      await page.screenshot({ path: 'screenshot_before_password.png', fullPage: true });
      throw new Error('Next button not found');
    }

    // 3. Wait for the password field to appear
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    // 4. Type the password
    await page.type('input[name="password"]', password, { delay: 100 });

    /******************************************************
     * CLICK THE "Log in" BUTTON
     ******************************************************/
    console.log('Attempting to click the "Log in" button...');
    const loginClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[role="button"]'));
      const loginButton = buttons.find(btn => btn.innerText.trim() === 'Log in');
      if (loginButton) {
        loginButton.click();
        return true;
      }
      return false;
    });

    if (loginClicked) {
      console.log('Clicked the "Log in" button.');
    } else {
      console.warn('Could not find the "Log in" button. Taking a screenshot for debugging.');
      await page.screenshot({ path: 'screenshot_before_login_click.png', fullPage: true });
      throw new Error('Log in button not found');
    }

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Login attempt finished. Verifying login status...');

    // Optional: Check for an element that only appears post-login
    const postLoginSelector = 'nav[aria-label="Primary"]';
    const loggedIn = await page.$(postLoginSelector);

    if (loggedIn) {
      console.log('Login successful!');
      // Save cookies after successful login
      const cookies = await page.cookies();
      fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
      console.log('Saved cookies to cookies.json');
    } else {
      console.log('Potential login failure. Please verify your credentials or update selectors.');
      await page.screenshot({ path: 'screenshot_after_login_attempt.png', fullPage: true });
      throw new Error('Login verification failed');
    }
  } catch (err) {
    console.error(`Error during login: ${err}`);
    throw err; // Rethrow to handle in the calling function
  }
}

/*****************************************************
 * COOKIE HANDLING FUNCTIONS
 *****************************************************/
/**
 * Load cookies from a JSON file and set them to the page.
 *
 * @param {object} page - Puppeteer Page object.
 * @param {string} filePath - Path to the cookies JSON file.
 * @returns {boolean} - Returns true if cookies were loaded, false otherwise.
 */
async function loadCookies(page, filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const cookiesString = fs.readFileSync(filePath);
      const cookies = JSON.parse(cookiesString);
      await page.setCookie(...cookies);
      console.log('Loaded cookies from cookies.json');
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error loading cookies: ${err}`);
    return false;
  }
}

/*****************************************************
 * SCRAPING FUNCTION
 *****************************************************/
/**
 * Scrape posts and profile data from a user’s X profile.
 *
 * @param {string} username - The @username of the target X profile.
 * @param {object} auth - Object containing login info:
 *                        { loginRequired, email, password }
 * @returns {object} - Object containing profile data and array of tweet objects
 */
async function scrapeXPosts(username, reqUsername, auth = {}) {
    // Destructure authentication settings
    const { loginRequired = false, email, password } = auth;
  
    // 1. Launch browser in headless mode with stealth
    const browser = await puppeteer.launch({
      headless: true, // Set to true for production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu',
        '--window-size=1280,800',
        '--start-maximized',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"',
      ],
    });
  
    const page = await browser.newPage();

}


/*****************************************************
 * EXPRESS ENDPOINT
 *****************************************************/
app.post('/syncX', async (req, res) => {
    // Expecting the request body to include:
    // {
    //   username: 'YourLocalUser',
    //   twitterUsername: 'TargetXUsername',
    //   loginRequired: true,
    //   email: 'email_for_login',
    //   password: 'password_for_login'
    // }
  
    const { username, twitterUsername } = req.body;
  
    const loginRequired = true;
  
    // If using environment variables, fetch them here
    const envEmail = process.env.TWITTER_EMAIL;
    const envPassword = process.env.TWITTER_PSW;
  
    // Override email and password with environment variables if they exist
    const finalEmail = envEmail;
    const finalPassword = envPassword;
  
    // Determine if login is required based on whether cookies are available
    let isLoginRequired = loginRequired;
  
    // If login is required but credentials are not provided, reject the request
    if (isLoginRequired && (!finalEmail || !finalPassword)) {
      return res.status(400).json({
        error: '"email" and "password" are required when "loginRequired" is true'
      });
    }
  
    if (!username || !twitterUsername) {
      return res.status(400).json({
        error: 'Both "username" (local) and "twitterUsername" (X username) are required'
      });
    }
  
    // Move the response after scraping to ensure it completes before responding
      res.json({ message: 'Synchronizing with X...' });
  
    try {
      let db = await getDB();
  
      // Pass authentication info to the scraper
      const scrapedData = await scrapeXPosts(twitterUsername, username, {
        loginRequired: isLoginRequired,
        email: finalEmail,
        password: finalPassword
      });
  
      const { profile, tweets } = scrapedData;
  
      // Prepare the document to insert
      const documentToInsert = {
        username,
        profile,
        tweets,
        scrapedAt: new Date()
      };
  
      // Insert scraped data into MongoDB
      await db.collection("twitter").insertOne(documentToInsert);
  
      console.log(`Successfully inserted data for user "${username}".`);
  
      let user = await db.collection("users").findOne({ username: username });
  
      const userMsg = `Please analyze the social media posts for user ${username}
        and then store any identified interests on-chain for token ID ${user.tokenId}.
        Make sure to add each interest using the addVerifiedInterest function and to not include commas in interest names. Wait for each single transaction to be confirmed before sending the next one.`;
  
      await axios.post(process.env.AGENT_DOMAIN + "/api/runAgent", {userMessage: userMsg});
  
      const userMsg2 = `Please update the follower count for the user with token ID ${user.tokenId} to ${profile.followersCount} for the social network platform 'twitter'`;
  
      await axios.post(process.env.AGENT_DOMAIN + "/api/runAgent", {userMessage: userMsg2});
  
      // Update sync progress (assuming 100% completion)
      await db.collection("syncProgress").updateOne(
        { username: username },
        { $set: { twitter: 100 } },
        { upsert: true } // Create the document if it doesn't exist
      );
  
    } catch (error) {
      console.error('An error occurred while scraping:', error);
      res.status(500).json({ error: 'An error occurred during scraping.' });
    }
  });
  
  /*****************************************************
   * START THE SERVER
   *****************************************************/
  app.listen(port, () => {
    console.log(`Scraping server running at http://localhost:${port}`);
  });
  