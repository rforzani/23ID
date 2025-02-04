"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { cloudPath } from "@/config/config";
import axios from "axios";

export default function RegisterCommunity() {
  // Local state to manage inputs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const { address, isConnected } = useAccount();

  const walletPressed = async () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!isConnected) {
        walletPressed();
        return;
      }

      if (address) {
        const message = "I want to create a community on 23ID";
        const signature = await signMessageAsync({ message });

        setLoading(true);
        const response = await axios.post(
          `${cloudPath}/createCommunity`,
          { walletAddress: address, signature, message, title, description, guidelines, contractAddress },
          { withCredentials: true }
        );
        setLoading(false);

        if (response.data.type === "success") {
          // Capture the AI agent's success message
          setAiMessage(response.data.message);
          // Reset the form fields
          setTitle("");
          setDescription("");
          setGuidelines("");
          setContractAddress("");
        }
      }
    } catch (error) {
      console.error("Error registering community:", error);
    }
  };

  return (
    <div className={styles.registerCommunityContainer}>
      <h1 className={styles.header}>Register a New Community</h1>

      {!loading ? (
        <>
          {/* Description block */}
          <p className={styles.description}>
            By creating your decentralized community on top of 23ID&apos;s
            infrastructure, you&apos;ll be able to manage admissions and rejections
            through our digital identities that merge users&apos; reputation across
            web2 and web3. Furthermore, you&apos;ll be able to moderate your
            community&apos;s content in a completely trustless, decentralized and
            effortless way thanks to upvotes, downvotes and AI agents.
          </p>

          <form onSubmit={handleFormSubmit} className={styles.form}>
            {/* Community Title */}
            <label className={styles.label}>
              Community Title
              <input
                type="text"
                className={styles.input}
                placeholder="Enter community title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            {/* Community Description */}
            <label className={styles.label}>
              Community Description
              <input
                type="text"
                className={styles.input}
                placeholder="Enter community description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </label>

            {/* Community Contract Address */}
            <label className={styles.label}>
              Community Contract Address
              <input
                type="text"
                className={styles.input}
                placeholder="Enter a contract address..."
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                required
              />
            </label>

            {/* Community Guidelines */}
            <label className={styles.label}>
              Community Guidelines
              <textarea
                className={styles.textarea}
                placeholder="Write your community guidelines here..."
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                required
              />
            </label>

            <button type="submit" className={styles.submitButton}>
              Register
            </button>
          </form>

          {/* AI Agent Success Message */}
          {aiMessage && (
            <div className={styles.aiMessageContainer}>
              <div className={styles.aiMessageBubble}>
                <h2>AI Agent Says:</h2>
                <p>{aiMessage}</p>
                <button
                  className={styles.dismissButton}
                  onClick={() => setAiMessage("")}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            width: 400,
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 40,
          }}
        >
          <div className={styles.loader}></div>
        </div>
      )}
    </div>
  );
}
