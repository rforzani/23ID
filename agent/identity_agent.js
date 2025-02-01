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

// File to persist the wallet data
const WALLET_DATA_FILE = "agent_wallet.txt";

let smartContractAddr = "0x86f61860ABfFb95d0f36707256B2a6A2CE4D7251";

let platformRegistryAddr = "0x0fAFbF24fD54071683954687CD6AfEF532EB4089";

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

const mintABI = [
  {
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "mintIdentityNFT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	}
];

const linkWalletABI = [
  {
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "wallet",
				"type": "address"
			}
		],
		"name": "linkWallet",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
];

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

    // Save wallet data
    const exportedWallet = await agentkit.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, exportedWallet);

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}