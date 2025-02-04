"use client";

import styles from "./page.module.css";
import Card from "./card";
import axios from "axios";
import { cloudPath } from "@/config/config";
import { useEffect, useState } from "react";
import Image from "next/image";
import Twitter from "./twitter.png";
import Linkedin from "./linkedin.png";
import Wallet from "./wallet.png";
import DetailedCard from "./detailedCard";
import PrivacyCard from "./prinacyCard";
import PrivacyDetailedCard from "./privacyDetailedCard";
import {
    useConnectModal,
    useAccountModal,
    useChainModal,
} from "@rainbow-me/rainbowkit";

import { useSignMessage, useAccount } from "wagmi";
import WalletCard from "./walletCard";
import WalletDetailedCard from "./walletDetailedCard";

export default function Add() {
    const [connectionStatuses, setConnectionStatuses] = useState<any>({});
    const [showingMoreInfo, setShowingMoreInfo] = useState(false);
    const [activeCard, setActiveCard] = useState("");
    const [syncProgress, setSyncProgress] = useState(0);
    const [isPrivacyClicked, setIsPrivacyClicked] = useState(false);
    const [connectionLoading, setConnectionLoading] = useState(false);
    const [aiMessage, setAiMessage] = useState("");
    const [openWalletDetails, setOpenWalletDetails] = useState(false);
    const [walletsNumber, setWalletsNumber] = useState(0);
    const [wallets, setWallets] = useState<Array<string>>([]);
    const [adminWallet, setAdminWallet] = useState("");
    const [loading, setLoading] = useState(true);

    const { openConnectModal } = useConnectModal();
    const { signMessageAsync } = useSignMessage();
    const { address, isConnected } = useAccount();

    const twitterPressed = async () => {
        if (connectionStatuses.twitter) {
            setActiveCard("twitter");
            setShowingMoreInfo(true);
        } else {
            twitterLogin();
        }
    };

    const walletPressed = async () => {
        if (openConnectModal) {
            openConnectModal();
        }
    };

    const connectNewWallet = async () => {
        try {
            if (!isConnected) {
                walletPressed();
                return;
            }

            if (address) {
                const message = "I want to connect my wallet to 23ID";
                const signature = await signMessageAsync({ message });

                // Send wallet address and signature to the backend
                setConnectionLoading(true);
                const response = await axios.post(
                    `${cloudPath}/validateNewWallet`,
                    { walletAddress: address, signature, message },
                    { withCredentials: true }
                );

                if (response.data.type === "success") {
                    setWalletsNumber(walletsNumber + 1);
                    setAiMessage(response.data.message);
                    setWallets([...wallets, address]);
                } else {
                    if (response.data.message) {
                        setAiMessage(response.data.message);
                    } else {
                        alert("Validation failed. Please try again.");
                    }
                }
                setConnectionLoading(false);
            }
        } catch (error) {
            console.error("Error connecting new wallet:", error);
        }
    };

    const handleWalletSign = async () => {
        if (!connectionStatuses.hasAWallet) {
            try {
                if (!isConnected) {
                    walletPressed();
                    return;
                }

                if (address) {
                    const message = "I want to connect my wallet to 23ID";
                    const signature = await signMessageAsync({ message });

                    // Send wallet address and signature to the backend
                    setConnectionLoading(true);
                    const response = await axios.post(
                        `${cloudPath}/validateFirstWallet`,
                        { walletAddress: address, signature, message },
                        { withCredentials: true }
                    );

                    if (response.data.type === "success") {
                        setConnectionStatuses((prev : any) => ({
                            ...prev,
                            hasAWallet: true,
                        }));
                        setWalletsNumber(walletsNumber + 1);
                        setAiMessage(response.data.message);
                        setAdminWallet(address);
                        setWallets([address]);
                    } else {
                        if (response.data.message) {
                            setAiMessage(response.data.message);
                        } else {
                            alert("Validation failed. Please try again.");
                        }
                    }
                    setConnectionLoading(false);
                }
            } catch (error) {
                console.error("Error signing and validating wallet:", error);
            }
        } else {
            setOpenWalletDetails(true);
            setShowingMoreInfo(false);
            setIsPrivacyClicked(false);
        }
    };

    const privacyClicked = async () => {
        setIsPrivacyClicked(true);
        setShowingMoreInfo(false);
    };

    const twitterLogin = async () => {
        try {
            window.location.href = cloudPath + "/api/auth/twitter";
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        async function fetchConnectionStatus() {
            try {
                const res = await axios.get(`${cloudPath}/getUserConnectionStatus`, {
                    withCredentials: true,
                });
                if (res.data.type === "success") {
                    setConnectionStatuses(res.data.connectionStatus);
                    setWalletsNumber(res.data.walletsNumber);
                    setWallets(res.data.wallets);
                    setAdminWallet(res.data.adminWallet);
                } else {
                    setConnectionStatuses({ twitter: false, linkedin: false, hasAWallet: false });
                }
                setLoading(false);
            } catch (error) {
                console.error("Error fetching connection status:", error);
            }
        }
        fetchConnectionStatus();
    }, []);

    useEffect(() => {
        let intervalId: any;

        const fetchSyncProgress = async (type: string) => {
            try {
                const res = await axios.post(
                    `${cloudPath}/getSyncProgress`,
                    { type: type },
                    { withCredentials: true }
                );
                if (res.data.type === "success") {
                    setSyncProgress(res.data.progress);
                } else {
                    console.error("Failed to fetch sync progress:", res.data.message);
                }
            } catch (error) {
                console.error("Error fetching sync progress:", error);
            }
        };

        if (showingMoreInfo && activeCard === "twitter") {
            fetchSyncProgress("twitter"); // Initial fetch
            intervalId = setInterval(() => fetchSyncProgress("twitter"), 7500); // Poll every 10 seconds
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [showingMoreInfo, activeCard]);


    if (loading) {
        return (
            <div className={styles.container}>
                <div style={{marginTop: 30}}>
                    <div className={styles.loader}></div>
                </div>
            </div>
        );
    }
    
    return (
        <div className={styles.container}>
            {!connectionStatuses.hasAWallet && (
                <div
                    style={{
                        color: "white",
                        borderBottom: "0.5px solid white",
                        paddingBottom: 20,
                        marginBottom: 50,
                    }}
                >
                    To create your digital identity and reputation NFT, you need to
                    start by connecting a wallet. Click on the card below to begin...
                </div>
            )}
            {aiMessage ? (
                <div className={styles["code-editor"]}>
                    <div className={styles.header}>
                        <span className={styles.title}>Message from our AI Agent</span>
                        <svg onClick={() => setAiMessage("")} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className={styles.icon}><g strokeWidth="0" id="SVGRepo_bgCarrier"></g><g strokeLinejoin="round" strokeLinecap="round" id="SVGRepo_tracerCarrier"></g><g id="SVGRepo_iconCarrier"> <path strokeLinecap="round" strokeWidth="2" stroke="#4C4F5A" d="M6 6L18 18"></path> <path strokeLinecap="round" strokeWidth="2" stroke="#4C4F5A" d="M18 6L6 18"></path> </g></svg>
                    </div>
                    <div className={styles["editor-content"]}>
                        {aiMessage}
                    </div>
              </div>
            )
            :
                <>
                     <div className={styles.cardsContainer}>
                        {connectionStatuses.hasAWallet && (
                            <>
                                <PrivacyCard onClick={() => privacyClicked()} />
                                <Card
                                    isLinked={connectionStatuses.twitter || false}
                                    cardPressed={() => twitterPressed()}
                                    logo={
                                        <Image
                                            src={Twitter.src}
                                            alt="Twitter"
                                            width={30}
                                            height={25}
                                            style={{ paddingTop: 10 }}
                                        />
                                    }
                                    name={"Twitter"}
                                />
                                <Card
                                    isLinked={connectionStatuses.linkedin || false}
                                    cardPressed={() => twitterPressed()}
                                    logo={
                                        <Image
                                            src={Linkedin.src}
                                            alt="LinkedIn"
                                            width={35}
                                            height={35}
                                            style={{ paddingTop: 10 }}
                                        />
                                    }
                                    name={"LinkedIn"}
                                />
                            </>
                        )}
                        <WalletCard cardPressed={handleWalletSign} walletsLinked={connectionStatuses.hasAWallet ? walletsNumber : 0} />
                    </div>
                    <div style={{ marginBlock: 25 }}>
                        {!connectionLoading ?
                            <>
                                {showingMoreInfo ? (
                                    <DetailedCard
                                        src={Twitter.src}
                                        onClose={() => setShowingMoreInfo(false)}
                                        progress={syncProgress.toFixed(1) as any}
                                    />
                                ) : 
                                    isPrivacyClicked ? (
                                        <PrivacyDetailedCard
                                            onClose={() => setIsPrivacyClicked(false)}
                                        />
                                    )
                                : openWalletDetails &&
                                    <WalletDetailedCard onConnectMore={() => connectNewWallet()} onClose={() => setOpenWalletDetails(false)} wallets={wallets} adminWallet={adminWallet} />
                                }
                            </>
                        :
                            <div style={{marginTop: 30}}>
                                <div className={styles.loader}></div>
                            </div>
                        }
                    </div>
                </>
            }
        </div>
    );
}
