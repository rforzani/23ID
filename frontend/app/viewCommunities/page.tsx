"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { cloudPath, contractAddress } from "@/config/config";
import styles from "./page.module.css";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

const abi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256",
      },
      {
        "internalType": "address",
        "name": "platform",
        "type": "address",
      }
    ],
    "name": "requestPlatformAdmission",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
];

export default function ViewCommunities() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [tokenId, setTokenId] = useState<string>("");
  const [txHash, setTxHash] = useState<any>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [loadingCommunityId, setLoadingCommunityId] = useState<string | null>(null); // Track loading per community
  const [pendingRequests, setPendingRequests] = useState<Array<string>>([]); // Track pending requests

  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // hasMounted logic
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Wallet logic
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const { writeContractAsync } = useWriteContract(); // Use async version

  const walletPressed = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  useEffect(() => {
    async function fetchCommunities() {
      try {
        const res = await axios.get(`${cloudPath}/getAllCommunities`, {
          withCredentials: true,
        });
        if (res.data.type === "success") {
          setCommunities(res.data.communities);
          setTokenId(res.data.tokenId);
        }
      } catch (err) {
        console.error("Error fetching communities:", err);
      }
    }

    async function fetchPendingRequests() {
      if (!isConnected || !address) return;
      try {
        const res = await axios.post(`${cloudPath}/getPendingRequests`, {address: address}, {
          withCredentials: true,
        });

        if (res.data.type === "success") {
          setPendingRequests(res.data.pendingRequests || []);
        }
      } catch (err) {
        console.error("Error fetching pending requests:", err);
      }
    }

    fetchCommunities();
    fetchPendingRequests();
  }, [isConnected, address]);

  async function requestToJoin(communityId: string) {
    console.log("Requesting to join community:", communityId);

    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      setLoadingCommunityId(communityId); // Set loading state only for the clicked button
      setTxError(null); // Reset any previous error

      // Call contract function and await response
      const tx = await writeContractAsync({
        abi,
        address: contractAddress,
        functionName: "requestPlatformAdmission",
        args: [tokenId, communityId],
      });

      setTxHash(tx); // Store transaction hash for tracking

      await axios.post(
        `${cloudPath}/recordRequestToJoin`,
        { address: address, platform: communityId },
        { withCredentials: true }
      );

      console.log("Transaction submitted:", tx);

      // Add community to pending requests
      setPendingRequests((prev) => [...prev, communityId]);
    } catch (err: any) {
      console.error("Error requesting to join:", err);
      setTxError("Transaction failed. Please try again.");
    } finally {
      setLoadingCommunityId(null); // Reset loading state after transaction
    }
  }

  // Ensure client and server render match
  if (!hasMounted) {
    return null;
  }

  return (
    <div className={styles.communitiesPage}>
      <h1 className={styles.header}>Available Communities</h1>
      <p className={styles.description}>
        Below are the communities you can join. Click on "Request to Join" to send a request.
      </p>

      {!isConnected ? (
        <button className={styles.connectWalletButton} onClick={walletPressed}>
          Connect Wallet
        </button>
      ) : (
        <div className={styles.connectedWalletInfo}>
          Connected wallet: {address}
        </div>
      )}

      {/* Transaction status messages */}
      {isTxSuccess && <p className={styles.txSuccess}>Transaction successful! ✅</p>}
      {txError && <p className={styles.txError}>{txError}</p>}

      <div className={styles.communitiesGrid}>
        {communities.map((community) => (
          <div key={community._id} className={styles.communityCard}>
            <h2>{community.title}</h2>
            <p className={styles.description}>{community.description}</p>
            <p className={styles.guidelines}>
              Guidelines: {community.guidelines}
            </p>
            <p className={styles.guidelines}>
              Members: {community.members.length}
            </p>
            <button
              className={styles.joinButton}
              onClick={() => requestToJoin(community.address)}
              disabled={pendingRequests.includes(community.address) || loadingCommunityId === community.address} // Show request pending
            >
              {loadingCommunityId === community.address
                ? "Processing..."
                : pendingRequests.includes(community.address)
                ? "Request Pending"
                : "Request to Join"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
