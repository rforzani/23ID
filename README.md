# 23ID - Moderation and acceptance for DAOs and WEB3 communities through NFT identities and AI agents

**23ID** is an innovative project for the AGENTIC ETHEREUM hackathon that bridges Web2 and Web3 by unifying digital identities through NFT profiles and enhancing community moderation with AI agents. Our platform empowers DAOs and Web3 communities to make informed decisions based on a comprehensive analysis of user data from both realms.

---

## Overview

In today's digital landscape, users often juggle multiple identities across decentralized platforms and centralized social networks. **23ID** solves this challenge by creating a unified digital NFT identity that aggregates data from:

- **Web3:** Multiple crypto wallets, on-chain reputation, and community interactions.
- **Web2:** Social network profiles that provide metrics such as followers, interests, and job positions.

Our dual AI agents not only moderate Web3 content by analyzing community upvotes and downvotes but also fetch and analyze Web2 data to build a richer, more accurate user profile.

---

## Features

- **Unified Digital Identity:**  
  Connect multiple Web3 wallets and various Web2 social networks into a single NFT-based identity.
  
- **Comprehensive Data Aggregation:**  
  Automatically fetch and store key metrics including:
  - Followers
  - Verified interests
  - Job positions
  - Reputation scores
  
- **Dual AI Analysis:**
  - **Content Moderation:**  
    AI agents evaluate community posts (via upvotes/downvotes) to ensure fair moderation of Web3 content.
    
  - **Data Insights:**  
    AI agents analyze Web2 data to identify user interests and professional backgrounds, enriching the overall profile.
  
- **Decentralized Governance:**  
  DAOs and communities can register on the platform to access verified user identities and make data-driven decisions.

---

## Architecture

**23ID** is built on a robust and scalable architecture that seamlessly integrates blockchain with traditional web technologies:

- **Smart Contracts:**
  - `DigitalIdentity.sol` – Manages NFT identity creation, updates, and the storage of aggregated data.
  - `PlatformRegistry.sol` – Enables third-party DAOs and communities to register and securely access user identities.
  
- **Data Integration:**
  - **Web3 Data:**  
    Captures on-chain interactions and community moderation signals.
  - **Web2 Data:**  
    Fetches social network data via APIs to enrich user profiles.
  
- **AI Agents:**
  - Analyze community content for moderation.
  - Process Web2 data to extract insights on user interests and job positions.

---

## Tech Stack

- **Blockchain:**  
  Solidity smart contracts deployed on the Sepolia testnet.
  
- **Frontend:**  
  React & Next.js v15 for a modern, responsive user interface. Significant CSS styling and React components were taken from UIverse
  
- **Backend:**  
  Node.js server managing API calls and business logic.
  
- **Development Tools:**  
  Coinbase AgentKit for seamless blockchain integration.