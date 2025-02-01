//import { getDB } from "../database/mongodbManager.js";
import cors from "cors";
import "dotenv/config";

const whitelist = [process.env.DOMAIN, process.env.CLOUD_FUNCTIONS_DOMAIN];

export const initWhitelist = async () => {
    try {
        /*const db = await getDB();
        const clients = await db.collection("oauthClients").find().toArray();
        for (let i = 0; i < clients.length; i++) {
            const redirectUriHost = new URL(clients[i].redirectUri).protocol + "//" + new URL(clients[i].redirectUri).host;
            if (!whitelist.includes(redirectUriHost)) {
                whitelist.push(redirectUriHost);
            }
        }
        console.log("CORS Whitelist initialized.");*/
    } catch (err) {
        console.error(err);
    }
}

function generateCorsOptions(req, callback) {
    const corsOptions = {
      origin: (origin, cb) => {
        if (!origin || whitelist.indexOf(origin) !== -1) {
          cb(null, true);
        } else {
          cb(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    };
  
    callback(null, corsOptions);
}

export const addDomain = (domain) => {
    whitelist.push(domain);
};

export const removeDomain = (domain) => {
    const index = whitelist.indexOf(domain);
    if (index !== -1) {
        whitelist.splice(index, 1);
    }
};

export const corsMiddleware = (req, res, next) => {
    generateCorsOptions(req, (err, corsOptions) => {
        if (err) {
            res.status(500).json({ error: "Failed to generate CORS options" });
        } else {
            cors(corsOptions)(req, res, next);
        }
    });
};