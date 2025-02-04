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


const getTokenIdFromAddressABI = [
    {
          "inputs": [
              {
                  "internalType": "address",
                  "name": "user",
                  "type": "address"
              }
          ],
          "name": "getTokenId",
          "outputs": [
              {
                  "internalType": "uint256",
                  "name": "tokenId",
                  "type": "uint256"
              }
          ],
          "stateMutability": "view",
          "type": "function"
      }
];

const getSocialFollowersABI = [
    {
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "platform",
				"type": "string"
			}
		],
		"name": "getSocialFollowers",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "followerCount",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
];

const getInterestesABI = [
    {
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "getVerifiedInterests",
		"outputs": [
			{
				"internalType": "string[]",
				"name": "interests",
				"type": "string[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

const getReputationCountersABI = [
    {
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "getReputationCounters",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "upvotes",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "downvotes",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
];

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


app.post("/signup", async (req, res) => {
    const db = await getDB();
    let hash = await bcrypt.hash(req.body.password, 10);
    await db.collection("users").insertOne({
        username: req.body.username,
        email: req.body.email,
        password: hash
    });
    res.json({type: "success", message: "User created successfully"});
});

app.get("/logout", isUserAuthenticated, (req, res) => {  
    res.clearCookie("23id_token", { domain: process.env.COOKIE_DOMAIN });
    res.clearCookie("23id_user", { domain: process.env.COOKIE_DOMAIN });
    res.json({type: "success", message: "Logout successful"});
});

app.post("/login", async (req, res) => {
    if (req.body.username && req.body.password) {
        const db = await getDB();
        const user = await db.collection("users").findOne({username: req.body.username});

        if (user) {
            if (await bcrypt.compare(req.body.password, user.password)) {
                let accessTokenId = crypto.randomBytes(64).toString("hex");
                const token = jwt.sign({ user: {username: user.username, email: user.email}, tokenId: accessTokenId }, process.env.JWT_KEY, {
                    algorithm: "HS256",
                    expiresIn: parseInt(process.env.JWT_EXPIRY_SECONDS),
                });
                res.cookie("23id_token", token, { maxAge: parseInt(process.env.JWT_EXPIRY_SECONDS) * 1000, httpOnly: true, secure: true, domain: process.env.COOKIE_DOMAIN, sameSite: "lax"});
                res.cookie("23id_user", JSON.stringify({loggedIn: "true"}), { maxAge: parseInt(process.env.JWT_EXPIRY_SECONDS) * 1000, secure: true, domain: process.env.COOKIE_DOMAIN, sameSite: "lax"});
                res.json({type: "success", message: "Login successful"});
            } else {
                res.json({type: "failure", message: "Incorrect username or password"});
            }
        } else {
            res.json({type: "failure", message: "Invalid username or password"});
        }
    } else {
        res.json({type: "failure", message: "Missing username or password"});
    }
});

app.get("/getUserConnectionStatus", isUserAuthenticated, async (req, res) => {
    try {
        let db = await getDB();
        let user = await db.collection("users").findOne({username: req.user.username});

        let status = {
            twitter: user.twitterUsername ? true : false,
            linkedin: user.linkedinUsername ? true : false,
            hasAWallet: user.hasAWallet ? true : false
        };

        let walletsNumber = status.hasAWallet ? user.wallets.length : 0;
        let wallets = status.hasAWallet ? user.wallets : [];
        let adminWallet = status.hasAWallet ? user.adminWallet : "";

        res.json({type: "success", message: "User connection status retrieved", connectionStatus: status, walletsNumber: walletsNumber, wallets: wallets, adminWallet: adminWallet});
    } catch (error) {
        res.json({type: "failure", message: "Error retrieving user connection status"});
    }
});

app.post("/validateNewWallet", isUserAuthenticated, async (req, res) => {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
        res.json({type: "failure", message: "Missing wallet address or signature or message"});
        return;
    }

    try {
        const db = await getDB();

        const recoveredAddress = verifyMessage(message, signature);

        let user = await db.collection("users").findOne({username: req.user.username});

        let tokenId = user.tokenId;
        let newWallets = user.wallets;

        if (newWallets.includes(walletAddress)) {
            res.json({type: "failure", message: "This wallet is already linked to your account."});
            return;
        }
        
        // Check if the recovered address matches the provided wallet address
        if (recoveredAddress.toLowerCase() === walletAddress.toLowerCase()) {
            const userMessage = `Link the wallet with address ${walletAddress} to the NFT with token ID ${tokenId}`;
            let agentRes = await axios.post(process.env.AGENT_DOMAIN + "/api/runAgent", {userMessage});
            if (agentRes.data.success) {
                const provider = new JsonRpcProvider("https://sepolia.base.org");
                const contractAddress = process.env.CONTRACT_ADDRESS;

                const contract = new Contract(contractAddress, getTokenIdFromAddressABI, provider);

                const idCheck = await contract.getTokenId(walletAddress);

                if (parseInt(idCheck) === parseInt(tokenId)) {
                    newWallets.push(walletAddress);
                    await db.collection("users").updateOne({username: req.user.username}, {$set: {wallets: newWallets}});
                    res.json({type: "success", message: agentRes.data.result });
                } else {
                    res.json({type: "failure", message: agentRes.data.result });
                }
                
            }
        } else {
          return res.status(400).json({
            type: "error",
            message: "Signature verification failed. Invalid wallet address.",
          });
        }
    } catch (error) {
        console.log(error);
        res.json({type: "failure", message: "Error validating wallet"});
    }
});

app.post("/validateFirstWallet", isUserAuthenticated, async (req, res) => {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
        res.json({type: "failure", message: "Missing wallet address or signature or message"});
        return;
    }

    try {
        const db = await getDB();

        const recoveredAddress = verifyMessage(message, signature);
        
        // Check if the recovered address matches the provided wallet address
        if (recoveredAddress.toLowerCase() === walletAddress.toLowerCase()) {
            const userMessage = `Create an empty NFT identity for the wallet address ${walletAddress}`;
            let agentRes = await axios.post(process.env.AGENT_DOMAIN + "/api/runAgent", {userMessage});
            if (agentRes.data.success) {
                const provider = new JsonRpcProvider("https://sepolia.base.org");
                const contractAddress = process.env.CONTRACT_ADDRESS;

                const contract = new Contract(contractAddress, getTokenIdFromAddressABI, provider);

                const tokenId = await contract.getTokenId(walletAddress);

                if (tokenId) {
                    await db.collection("users").updateOne({username: req.user.username}, {$set: {wallets: [walletAddress], tokenId: tokenId, hasAWallet: true, adminWallet: walletAddress}});
                    res.json({type: "success", message: agentRes.data.result });
                } else {
                    res.json({type: "failure", message: agentRes.data.result });
                }
                
            }
        } else {
          return res.status(400).json({
            type: "error",
            message: "Signature verification failed. Invalid wallet address.",
          });
        }
    } catch (error) {
        console.log(error);
        res.json({type: "failure", message: "Error validating wallet"});
    }
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

const cleanup = async () => {    
    process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

export { app };
