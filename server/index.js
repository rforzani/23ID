import express from "express";
import cookieParser from "cookie-parser";
import { corsMiddleware, initWhitelist } from "./managers/cors/corsManager.js";
import { getDB, initializeDB } from "./managers/database/mongodbManager.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import { Contract, JsonRpcProvider, verifyMessage } from "ethers";

const app = express();

app.use(corsMiddleware);

initializeDB();
initWhitelist();

app.use(cookieParser());

const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWITTER_USER_URL = "https://api.twitter.com/2/users/me";

// Step 1: Redirect user to Twitter's authorization page
app.get('/api/auth/twitter', (req, res) => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.TWITTER_CLIENT_ID,
      redirect_uri: process.env.TWITTER_CALLBACK_URL,
      scope: 'tweet.read users.read offline.access',
      state: 'state_value', // Use a unique value for CSRF protection
      code_challenge: 'challenge',
      code_challenge_method: 'plain',
    });
  
    res.redirect(`${TWITTER_AUTH_URL}?${params.toString()}`);
  });
  
  app.post('/getSyncProgress', isUserAuthenticated, async (req, res) => {
      if (req.body.type) {
          let db = await getDB();
          let syncProgress = await db.collection("syncProgress").findOne({username: req.user.username});
          let toReturn = syncProgress[req.body.type];
          res.json({type: "success", progress: toReturn});
      } else {
          res.json({type: "failure", message: "Missing type"});
      }
  });
  
  // Step 2: Handle the callback from Twitter
  app.get('/api/auth/twitter/callback', isUserAuthenticated, async (req, res) => {
      const { code } = req.query;
    
      try {
            const base64Credentials = Buffer.from(
                `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
            ).toString('base64');
          
            const tokenResponse = await axios.post(
                TWITTER_TOKEN_URL,
                    new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: process.env.TWITTER_CALLBACK_URL,
                    client_id: process.env.TWITTER_CLIENT_ID,
                    code_verifier: 'challenge',
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Authorization: `Basic ${base64Credentials}`,
                    },
                }
            );
          
    
        const { access_token } = tokenResponse.data;
    
        // Fetch user info with access token
        const userResponse = await axios.get(TWITTER_USER_URL, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
  
        console.log(userResponse.data);
  
        let db = await getDB();
  
        await db.collection("users").updateOne({username: req.user.username}, {$set: {twitterUsername: userResponse.data.username}});
    
        res.redirect(process.env.DOMAIN + "/add");
  
        await db.collection("syncProgress").updateOne({username: req.user.username}, {$set: {username: req.user.username, twitter: 0}}, {upsert: true});
  
        await axios.post(process.env.SCRAPING_DOMAIN + "/syncX", {twitterUsername: userResponse.data.username, username: req.user.username});
  
      } catch (error) {
        console.error('Error during authentication:', error.response?.data || error.message);
        res.status(500).json({ error: 'Authentication failed' });
      }
});

const cleanup = async () => {    
    process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

export { app };
