"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./page.module.css"; // Updated CSS
import { cloudPath } from "@/config/config";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";

interface Community {
  _id: string;
  title: string;
  description: string;
  guidelines: string;
  members: any[];
  address?: string;
  requests: string[];
}

interface Profile {
    address: string;
    username?: string;
    score?: number;
    twitterFollowers?: number;
    verifiedInterests?: string[];
    upvotes?: number;
    downvotes?: number;
    connectedWallets?: number;
    reputationScore?: number;
    connectedSocials?: number;
    communityAddress?: string;
    socialNetworks?: {
      name: string;
      username: string;
      followers: number;
      joinedDate: string;
      posts: { text: string; time: string; likes: number | null; views: number }[];
    }[];
  }
  

export default function OwnedCommunities() {
    const [ownedCommunities, setOwnedCommunities] = useState<Community[]>([]);
    const [expandedCommunities, setExpandedCommunities] = useState<{ [key: string]: boolean }>({});
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

   
    const { openConnectModal } = useConnectModal();
    const { signMessageAsync } = useSignMessage();
    const { address, isConnected } = useAccount();

    const walletPressed = async () => {
        if (openConnectModal) {
            openConnectModal();
        }
    };

  useEffect(() => {
    async function fetchOwnedCommunities() {
      try {
        const res = await axios.get(`${cloudPath}/getOwnedCommunities`, {
          withCredentials: true,
        });
        if (res.data.type === "success") {
          setOwnedCommunities(res.data.communities);
        } else {
          console.error("Error fetching owned communities:", res.data.message);
        }
      } catch (error) {
        console.error("Error fetching owned communities:", error);
      }
    }
    fetchOwnedCommunities();
  }, []);

  const toggleExpand = (communityId: string) => {
    setExpandedCommunities((prev) => ({
      ...prev,
      [communityId]: !prev[communityId],
    }));
  };

  const fetchProfileDetails = async (address: string, communityAddress: string) => {
    try {
      const res = await axios.post(`${cloudPath}/getProfileInfoFromAddress`, {address: address}, {
        withCredentials: true,
      });
      if (res.data.type === "success") {
        setSelectedProfile({...res.data.data, communityAddress: communityAddress});
      } else {
        console.error("Error fetching profile:", res.data.message);
      }
    } catch (error) {
      console.error("Error fetching profile details:", error);
    }
  };


  const handleAccept = async () => {
    if (selectedProfile === null) return;
    try {
        if (!isConnected) {
            walletPressed();
            return;
        }

        if (address) {
            const message = "I want to accept wallet address " + selectedProfile.address + " into my community.";
            const signature = await signMessageAsync({ message });

            let res = await axios.post(`${cloudPath}/acceptRequest`, {signingAddress: address, acceptedAddress: selectedProfile.address, signature, message, communityAddress: selectedProfile.communityAddress}, { withCredentials: true });

            if (res.data.type === "success") {
              setOwnedCommunities((prev) => {
                const updatedCommunities = prev.map((community) => {
                  if (community.address === selectedProfile.communityAddress) {
                    return {
                      ...community,
                      requests: community.requests.filter((address) => address !== selectedProfile.address),
                      members: [...community.members, selectedProfile.address],
                    };
                  }
                  return community;
                });
                return updatedCommunities;
              });
            }
        }
    } catch (error) {
      console.error("Error accepting request:", error);
    }
    setSelectedProfile(null);
  };

  const handleReject = async () => {
    alert("Rejected request!"); // Replace with actual API call
    setSelectedProfile(null);
  };


  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Owned Communities</h1>
      <div className={styles.titleDescription}>Below you'll find a list of the communities you have created and currently own. <br /> View, approve or reject pending admission requests from this dashboard!</div>
      <div className={styles.communitiesList}>
        {ownedCommunities.map((community) => (
          <div key={community._id} className={styles.communityPanel}>
            <div className={styles.communityHeader}>
              <h2>{community.title}</h2>
              <button 
                className={styles.toggleButton}
                onClick={() => toggleExpand(community._id)}
              >
                {expandedCommunities[community._id] ? "Hide Requests" : "View Requests"}
              </button>
            </div>
            <p className={styles.description}>{community.description}</p>
            <p className={styles.guidelines}><strong>Guidelines:</strong> {community.guidelines}</p>
            <p className={styles.guidelines}><strong>Pending Requests:</strong> {community.requests.length}</p>

            {expandedCommunities[community._id] && community.requests.length > 0 && (
              <div className={styles.requestList}>
                {community.requests.map((address) => (
                  <div
                    key={address}
                    className={styles.requestItem}
                    onClick={() => fetchProfileDetails(address, community.address as any)}
                  >
                    {address}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedProfile && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button className={styles.closeButton} onClick={() => setSelectedProfile(null)}>✖</button>
            <h2>Profile Details</h2>
            <p><strong>Address:</strong> {selectedProfile.address}</p>
            {selectedProfile.username && <p><strong>Username:</strong> {selectedProfile.username}</p>}
            {selectedProfile.twitterFollowers !== undefined && (
              <p><strong>Reputation Score:</strong> {selectedProfile.reputationScore}</p>
            )}
            {selectedProfile.verifiedInterests && (
              <p><strong>Interests:</strong> {selectedProfile.verifiedInterests.join(", ")}</p>
            )}
            {selectedProfile.connectedWallets !== undefined && (
              <p><strong>Connected Wallets:</strong> {selectedProfile.connectedWallets}</p>
            )}
            {selectedProfile.socialNetworks && (
              <div>
                <h3>Social Networks</h3>
                {selectedProfile.socialNetworks.map((network) => (
                  <div key={network.username} className={styles.socialProfile}>
                    <p><strong>{network.name}</strong>: @{"demohandle"/*network.username*/}</p>
                    <p><strong>Followers:</strong> {network.followers}</p>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.buttonGroup}>
              <button className={styles.acceptButton} onClick={handleAccept}>Accept</button>
              <button className={styles.rejectButton} onClick={handleReject}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
