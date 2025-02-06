import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpTool, CdpToolkit } from "@coinbase/cdp-langchain";
import { readContract } from "@coinbase/coinbase-sdk";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import { z } from "zod";
import { getDB } from "./database/mongodbManager.js";
import OpenAI from "openai";
import { addInterestAbi, addCommunityABI, linkWalletABI, mintABI, updateFollowersABI, getTokenIdFromAddressABI } from "./abis.js";  

// File to persist the wallet data
const WALLET_DATA_FILE = "agent_wallet.txt";

let smartContractAddr = "0xF39403A7A53c609cDbA182ef6C1Be28D2FfeC7A5";

let platformRegistryAddr = "0xE3d7f36d185cC05BeB85e9DEafffb41f51B6A5a6";

const AnalyzeSocialMediaInput = z
  .object({
    username: z.string().describe("The username of the user."),
  })
  .strip()
  .describe("Fetch and analyze social media posts to identify interests.");

const MintEmptyNFTIdentityInput = z
  .object({
    to: z.string().describe("The address to mint the NFT to."),
  })
  .strip()
  .describe("Mint an empty NFT identity for the given address.");

const LinkWalletToIdentityInput = z
  .object({
    wallet: z.string().describe("The new wallet address to link."),
    tokenId: z.string().describe("The NFT token ID to link the wallet to."),
  })
  .strip()
  .describe("Link a new wallet address to an existing NFT Identity.");

const AddInterestInput = z
  .object({
    tokenId: z.string().describe("The NFT token ID representing the user's identity."),
    interest: z.string().describe("The verified interest to be added."),
  }) 
  .strip()
  .describe("Add a verified interest to the on-chain identity.");

const UpdateFollowersInput = z
  .object({
    tokenId: z.string().describe("The NFT token ID representing the user's identity."),
    platform: z.string().describe("The social media platform."),
    followerCount: z.number().describe("The follower count."),
  })
  .strip()
  .describe("Update the follower count for a given social media platform.");

const RegisterCommunityInput = z
  .object({
    platformAddress: z.string().describe("The address of the platform."),
    name: z.string().describe("The name of the platform."),
    guidelines: z.string().describe("The guidelines of the platform."),
    owner: z.string().describe("The token id owner of the platform."),
  })
  .strip()
  .describe("Register a new community platform.");

// Tool to link a new wallet to an existing NFT identity
async function linkWalletToIdentity(wallet, args) {
  const { wallet: newWallet, tokenId } = args;
  console.log(`Linking new wallet ${newWallet} to NFT identity with token ID: ${tokenId}`);
  try {
    const contractInvocation = await wallet.invokeContract({
      contractAddress: smartContractAddr,
      method: "linkWallet",
      args: { tokenId: tokenId, wallet: newWallet },
      abi: linkWalletABI,
    });

    await contractInvocation.wait();

    return `Successfully linked new wallet ${wallet} to NFT identity with token ID ${tokenId}.`;
  } catch (err) {
    console.error(err);
    return "Failed to link new wallet due to an error.";
  }
}

// Tool to mint an empty NFT identity
async function mintEmptyNFTIdentity(wallet, args) {
  const { to } = args;
  //console.log(`Minting an empty NFT identity for address: ${to}`);

  try {
    const contractInvocation = await wallet.invokeContract({
      contractAddress: smartContractAddr,
      method: "mintIdentityNFT",
      args: { to: to },
      abi: mintABI,
    });

    await contractInvocation.wait();

    const tokenId = await readContract({
      networkId: process.env.NETWORK_ID || "base-sepolia",
      abi: getTokenIdFromAddressABI,
      contractAddress: smartContractAddr,
      method: "getTokenId",
      args: { user: to },
    });

    return `Successfully minted an empty NFT identity with token ID ${tokenId} for address ${to}.`;
  } catch (err) {
    console.error(err);
    return "Failed to mint an empty NFT identity due to an error.";
  }
}

// Tool to analyze social media posts
async function analyzeSocialMedia(args) {
  console.log(`Analyzing social media for user: ${args.username}`);

  try {
    const db = await getDB();
    const twitterData = await db.collection("twitter").findOne({ username: args.username });
    if (!twitterData) {
      return "None";
    }

    // Extract interests from social media posts
    const posts = twitterData.tweets;

    const formattedPosts = posts.map((post) => `POST TEXT: ${post.text}, TIME: ${post.time}\n`).join("");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
    const openaiRes = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant that analyzes user interests from social media posts. Extrapolate up to 5 categories of interest from the following social media posts if possible. Return just the interests separated by commas. An example return answer would be: 'Art, Memes, Technology, Science, Sports'. If no interests are identified return the word 'None'.",
        },
        {
          role: "user",
          content: formattedPosts,
        },
      ],
    });

    const res = openaiRes.choices[0].message.content?.trim();

    // Return the string result directly
    return res === "None" || !res ? "None" : res;
  } catch (err) {
    console.error(err);
    return "None";
  }
}


// Tool to interact with blockchain and add verified interests
async function addInterestToBlockchain(wallet, args) {
  const { tokenId, interest } = args;
  console.log(`Adding interest '${interest}' to token ID: ${tokenId}`);

  try {
    const contractInvocation = await wallet.invokeContract({
      contractAddress: smartContractAddr,
      method: "addVerifiedInterest",
      args: {tokenId: tokenId, interest: interest},
      abi: addInterestAbi,
    });

    await contractInvocation.wait();

    return `Successfully added interest '${interest}' to token ID ${tokenId}.`;
  } catch (err) {
    console.error(err);
    return "Failed to add interest to blockchain due to an error.";
  }
}

async function updateSocialFollowers(wallet, args) {
  const { tokenId, platform, followerCount } = args;
  console.log(`Updating follower count for platform ${platform} to ${followerCount} for token ID: ${tokenId}`);

  try {
    const contractInvocation = await wallet.invokeContract({
      contractAddress: smartContractAddr,
      method: "updateSocialFollowers",
      args: {tokenId: tokenId, platform: platform, followerCount: String(followerCount)},
      abi: updateFollowersABI,
    });

    await contractInvocation.wait();

    return `Successfully updated follower count for platform ${platform} to ${followerCount} for token ID ${tokenId}.`;
  } catch (err) {
    console.error(err);
    return "Failed to update follower count due to an error.";
  }
}

async function registerCommunity(wallet, args) {
  const { platformAddress, name, guidelines, owner } = args;
  console.log(`Registering community platform ${name} with address ${platformAddress}`);

  try {
    const contractInvocation = await wallet.invokeContract({
      contractAddress: platformRegistryAddr,
      method: "registerPlatform",
      args: { platformAddress: platformAddress, name: name, guidelines: guidelines, owner: owner },
      abi: addCommunityABI,
    });

    await contractInvocation.wait();

    return `Successfully registered community platform ${name} with address ${platformAddress}.`;
  } catch (err) {
    console.error(err);
    return "Failed to register community platform due to an error.";
  }
}

export async function initializeAgent() {
  try {
    // Initialize LLM
    const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

    let walletDataStr = null;

    // Read existing wallet data if available
    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
      } catch (error) {
        console.error("Error reading wallet data:", error);
      }
    }

    // Configure CDP AgentKit
    const config = {
      cdpWalletData: walletDataStr || undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    // Initialize CDP AgentKit
    const agentkit = await CdpAgentkit.configureWithWallet(config);

    // Initialize CDP AgentKit Toolkit and get tools
    const cdpToolkit = new CdpToolkit(agentkit);
    const tools = cdpToolkit.getTools();

    // Add social media analysis tool
    const socialMediaTool = new CdpTool(
      {
        name: "analyze_social_media",
        description: "Analyze recent social media posts to identify user interests.",
        argsSchema: AnalyzeSocialMediaInput,
        func: analyzeSocialMedia,
      },
      agentkit,
    );
    tools.push(socialMediaTool);

    // Add blockchain interaction tool
    const addInterestTool = new CdpTool(
      {
        name: "add_interest_to_blockchain",
        description: "Add a verified interest to the on-chain identity NFT.",
        argsSchema: AddInterestInput,
        func: addInterestToBlockchain,
      },
      agentkit,
    );
    tools.push(addInterestTool);

    // Add mint empty NFT identity tool
    const mintEmptyNFTIdentityTool = new CdpTool(
      {
        name: "mint_empty_nft_identity",
        description: "Mint an empty NFT identity for a given address.",
        argsSchema: MintEmptyNFTIdentityInput,
        func: mintEmptyNFTIdentity,
      },
      agentkit,
    );
    tools.push(mintEmptyNFTIdentityTool);

    // Add link wallet to identity tool
    const linkWalletToIdentityTool = new CdpTool(
      {
        name: "link_wallet_to_identity",
        description: "Link a new wallet address to an existing NFT identity.",
        argsSchema: LinkWalletToIdentityInput,
        func: linkWalletToIdentity,
      },
      agentkit,
    );
    tools.push(linkWalletToIdentityTool);

    // Add update followers tool
    const updateFollowersTool = new CdpTool(
      {
        name: "update_followers",
        description: "Update the follower count for a given social media platform.",
        argsSchema: UpdateFollowersInput,
        func: updateSocialFollowers,
      },
      agentkit,
    );
    tools.push(updateFollowersTool);

    // Add register community tool
    const registerCommunityTool = new CdpTool(
      {
        name: "register_community",
        description: "Register a new community platform.",
        argsSchema: RegisterCommunityInput,
        func: registerCommunity,
      },
      agentkit,
    );
    tools.push(registerCommunityTool);

    // Store buffered conversation history in memory
    const memory = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "Digital Identity and Interest Synchronization" },
    };

    // Create React Agent
    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier:
        "You are an AI agent that analyzes user interests from social media and updates their on-chain identity NFTs with verified interests.",
    });

    // Save wallet data
    const exportedWallet = await agentkit.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, exportedWallet);

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}