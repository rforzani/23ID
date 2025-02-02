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

  try {
    // 2. Set viewport size
    await page.setViewport({ width: 1280, height: 800 });

    /*****************************************************
     * LOAD COOKIES IF AVAILABLE
     *****************************************************/
    const cookiesLoaded = await loadCookies(page, COOKIES_PATH);

    /*****************************************************
     * NAVIGATE TO USER PROFILE
     *****************************************************/
    const profileUrl = `https://x.com/${username}`;
    console.log(`Navigating to: ${profileUrl}`);

    await page.goto(profileUrl, { waitUntil: 'networkidle2' });

    // Check if we are logged in by looking for a specific element
    const postLoginSelector = 'nav[aria-label="Primary"]';
    let loggedIn = await page.$(postLoginSelector);

    if (!loggedIn && cookiesLoaded) {
      console.log('Cookies loaded but not authenticated. Clearing cookies and proceeding to login.');
      // Clear invalid cookies
      await page.deleteCookie(...await page.cookies());
      fs.unlinkSync(COOKIES_PATH); // Remove the invalid cookies file
      // Proceed to login if required
      if (loginRequired) {
        console.log('Proceeding to login as cookies are invalid.');
        await performLogin(page, email, password);
      } else {
        console.warn('Cookies are invalid and login is not required. Proceeding without authentication.');
      }
    } else if (!loggedIn && !cookiesLoaded && loginRequired) {
      console.log('Not authenticated and no cookies found. Proceeding to login.');
      await performLogin(page, email, password);
      // After login, set loggedIn to true
      loggedIn = await page.$(postLoginSelector);
    } else if (!loggedIn && !loginRequired) {
      console.warn('Not authenticated but login is not required. Content may be restricted.');
      // Optionally, you can decide to throw an error or proceed
    } else {
      console.log('Authenticated using existing cookies.');
    }

    /*****************************************************
     * NAVIGATE TO USER PROFILE AGAIN IF Logged In
     *****************************************************/
    if (loggedIn || (loginRequired && await page.$(postLoginSelector))) {
      console.log('Navigating to the user profile after authentication...');
      await page.goto(profileUrl, { waitUntil: 'networkidle2' });
      console.log('Profile page loaded successfully.');
    }

    /*****************************************************
     * EXTRACT PROFILE INFORMATION
     *****************************************************/
    const profileInfo = await page.evaluate((username) => {
      const profile = {};

      // Helper function to clean and parse numbers
      function parseNumber(text) {
        if (!text) return null;
        // Remove commas and non-digit characters
        return parseInt(text.replace(/[^0-9]/g, ''), 10) || null;
      }

      // 4.a. Extract Joined Date
      const joinedSpan = Array.from(document.querySelectorAll('span')).find(span =>
        span.innerText.startsWith('Joined')
      );
      profile.joinedDate = joinedSpan ? joinedSpan.innerText.replace('Joined ', '').trim() : null;

      // 4.b. Extract Followers Count
      // Updated selector to use '/verified_followers' as per user's input
      const followersLink = document.querySelector(`a[href="/${username}/verified_followers"], a[href="/${username}/followers"]`);
      if (followersLink) {
        // The number is typically in the first nested span
        const followersSpan = followersLink.querySelector('span > span');
        profile.followersCount = followersSpan ? parseNumber(followersSpan.innerText) : 0;
      } else {
        profile.followersCount = 0;
      }

      // 4.c. Extract Following Count
      // Assuming the 'following' link is still '/username/following'
      const followingLink = document.querySelector(`a[href="/${username}/following"]`);
      if (followingLink) {
        // The number is typically in the first nested span
        const followingSpan = followingLink.querySelector('span > span');
        profile.followingCount = followingSpan ? parseNumber(followingSpan.innerText) : 0;
      } else {
        profile.followingCount = 0;
      }

      return profile;
    }, username);

    console.log('Extracted Profile Information:', profileInfo);

    /*****************************************************
     * CHECK IF PROFILE DATA WAS SUCCESSFULLY EXTRACTED
     *****************************************************/
    if (!profileInfo.joinedDate) {
      console.warn('Could not extract profile information. Proceeding with scraping tweets (if any).');
    }

    /*****************************************************
     * TWEET EXTRACTION FUNCTION
     *****************************************************/
    const extractTweets = async () => {
      return page.$$eval('article[data-testid="tweet"]', (articles) => {
        // Helper function to parse likes and views
        function parseLikesAndViews(ariaLabel) {
          if (!ariaLabel) return { likes: null, views: null };

          let likes = null;
          let views = null;

          // Example ariaLabel: "2 Likes, 110 Views"
          const likesMatch = ariaLabel.match(/(\d[\d,\.]*)\s+likes?/i);
          const viewsMatch = ariaLabel.match(/(\d[\d,\.]*)\s+views?/i);

          if (likesMatch) {
            likes = parseInt(likesMatch[1].replace(/,/g, ''), 10);
          }

          if (viewsMatch) {
            views = parseInt(viewsMatch[1].replace(/,/g, ''), 10);
          }

          return { likes, views };
        }

        return articles.map((article) => {
          // 1. Tweet Text
          const textBlocks = article.querySelectorAll(
            'div[data-testid="tweetText"], div[lang], span[lang]'
          );
          let combinedText = '';
          textBlocks.forEach((block) => {
            combinedText += block.innerText.trim() + ' ';
          });
          combinedText = combinedText.trim();

          // 2. Time from <time> element
          let timeValue = null;
          const timeEl = article.querySelector('time');
          if (timeEl) {
            timeValue = timeEl.getAttribute('datetime') || null;
          }

          // 3. Likes/Views from aria-label
          let likes = null;
          let views = null;
          const ariaDiv = article.querySelector('div[aria-label*="views"]');
          if (ariaDiv) {
            const ariaLabelVal = ariaDiv.getAttribute('aria-label') || '';
            const { likes: l, views: v } = parseLikesAndViews(ariaLabelVal);
            likes = l;
            views = v;
          }

          return {
            text: combinedText,
            time: timeValue,
            likes,
            views,
          };
        });
      });
    };

    /*****************************************************
     * EXPAND "SHOW MORE" BUTTONS
     *****************************************************/
    const expandShowMoreButtons = async () => {
      const showMoreButtons = await page.$$('div[data-testid="caret"]'); // Adjust selector if needed
      for (const btn of showMoreButtons) {
        try {
          await btn.click();
          await delay(1000); // Wait for content to expand
          console.log('Clicked a "Show more" button for truncated tweet.');
        } catch (error) {
          console.log('No "Show more" button found or already expanded.');
        }
      }
    };

    /*****************************************************
     * HYBRID AUTO-SCROLL FUNCTION
     *****************************************************/
    async function hybridAutoScrollAndCollect(allTweetsSet) {
        let attempts = 0;
        const maxScrollAttempts = 20;
        let sameCountHeightCounter = 0;
        const maxSameCount = 10;
      
        // NEW: track how many consecutive attempts found zero *total* tweets
        let consecutiveNoTweets = 0;
        const maxNoTweets = 3; // Adjust as needed
      
        let prevHeight = await page.evaluate(() => document.body.scrollHeight);
        let prevTweetCount = (await extractTweets()).length;
      
        let scrollPosition = 0;
        const scrollStep = 1000;
      
        while (attempts < maxScrollAttempts && sameCountHeightCounter < maxSameCount) {
          attempts++;


          let newProgress = attempts / maxScrollAttempts * 100;
          let db = await getDB();

          // Update sync progress

          await db.collection("syncProgress").updateOne({ username: reqUsername }, { $set: { twitter: newProgress } }, { upsert: true });
          

          scrollPosition += scrollStep;
      
          // Make sure we don't scroll beyond the current document height
          const currentScrollHeight = await page.evaluate(() => document.body.scrollHeight);
          if (scrollPosition > currentScrollHeight) {
            scrollPosition = currentScrollHeight;
          }
      
          // Scroll to the new position
          await page.evaluate((pos) => {
            window.scrollTo({ top: pos, behavior: 'smooth' });
          }, scrollPosition);
      
          console.log(`\n[Scroll #${attempts}] -> Scrolled to ${scrollPosition}px`);
      
          // Wait for new content to load
          await delay(1500);
      
          // Expand any "Show more" buttons
          await expandShowMoreButtons();
      
          // Screenshot is optional
          // await page.screenshot({ path: `after_scroll_${attempts}.png` });
      
          // Extract tweets mid-scroll
          const newTweets = await extractTweets();
          newTweets.forEach((tweetObj) => {
            const key = JSON.stringify(tweetObj);
            allTweetsSet.add(key);
          });
      
          console.log(
            `Mid-scroll extraction found ${newTweets.length} tweets. ` +
            `Total unique so far: ${allTweetsSet.size}`
          );
      
          // Check for new content
          const newHeight = await page.evaluate(() => document.body.scrollHeight);
          const newTweetCount = newTweets.length;
      
          console.log(
            `Prev height: ${prevHeight}, New height: ${newHeight} | ` +
            `Prev tweet count: ${prevTweetCount}, New tweet count: ${newTweetCount}`
          );
      
          if (newHeight > prevHeight || newTweetCount > prevTweetCount) {
            sameCountHeightCounter = 0;
            prevHeight = newHeight;
            prevTweetCount = newTweetCount;
            console.log('New content detected. Reset sameCountHeightCounter=0.');
          } else {
            sameCountHeightCounter++;
            console.log(`No new content detected. sameCountHeightCounter=${sameCountHeightCounter}`);
          }
      
          // NEW: Early exit if total tweets are still 0
          if (allTweetsSet.size === 0 && newTweets.length === 0) {
            consecutiveNoTweets++;
            console.log(`No tweets found yet. Consecutive attempts with zero tweets=${consecutiveNoTweets}`);
            if (consecutiveNoTweets >= maxNoTweets) {
              console.log(`Exiting early — user likely has no tweets after ${consecutiveNoTweets} checks.`);
              break;
            }
          } else {
            // Reset if we did get something
            consecutiveNoTweets = 0;
          }
      
          // Random delay to mimic human behavior (3-5 seconds)
          const randomDelay = Math.floor(Math.random() * 1000) + 500;
          console.log(`Waiting ~${(randomDelay / 1000).toFixed(2)}s before the next scroll...`);
          await delay(randomDelay);
        }
      
        console.log('\nFinished hybrid auto-scrolling.');
    }

    /*****************************************************
     * SCROLL & COLLECT TWEETS
     *****************************************************/
    const allTweetsSet = new Set();
    await hybridAutoScrollAndCollect(allTweetsSet);

    // Final extraction to catch any remaining tweets
    const finalTweets = await extractTweets();
    finalTweets.forEach((tweetObj) => {
      const key = JSON.stringify(tweetObj);
      allTweetsSet.add(key);
    });
    console.log(
      `\nFinal extraction found ${finalTweets.length} tweets. ` +
      `Grand total unique so far: ${allTweetsSet.size}`
    );

    // Convert from set-of-strings to array-of-objects
    const allTweetsArray = Array.from(allTweetsSet).map((jsonStr) => JSON.parse(jsonStr));
    console.log(`\nGrand total unique tweet objects: ${allTweetsArray.length}`);

    // Close the browser
    await browser.close();
    console.log('Browser closed. Scraping complete.');

    // Return the collected data
    return {
      profile: profileInfo,
      tweets: allTweetsArray.length > 0 ? allTweetsArray : []
    };
  } catch (error) {
    console.error('An error occurred while scraping:', error);
    await browser.close();
    console.log('Browser closed due to error.');
    return {
      profile: {}, // Return empty profile in case of error
      tweets: []
    };
  }
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
