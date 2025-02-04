"use client"

import { cloudPath } from "@/config/config";
import axios from "axios";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import Twitter from "../add/twitter.png";
import { TweetPost } from "./Tweetpost";

export default function Dashboard() {
    const [userData, setUserData] = useState<any>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function fetchConnectionStatus() {
            try {
                const res = await axios.get(`${cloudPath}/getUserProfileInfo`, {
                    withCredentials: true,
                });
                if (res.data.type === "success") {
                    console.log("User profile info fetched successfully:", res.data);
                    setUserData(res.data);
                } else {
                    console.error("Error fetching user profile info:", res.data.message);
                }
                setLoading(false);
            } catch (error) {
                console.error("Error fetching connection status:", error);
            }
        }
        fetchConnectionStatus();
    }, []);

    
    return (
        <div style={{marginBlock: 20}}> 
            {loading ?
                <div style={{marginTop: 30}}>
                    <div className={styles.loader}></div>
                </div>
            :
                <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
                    <div className={styles["flip-card"]}>
                        <div className={styles["flip-card-inner"]}>
                            <div className={styles["flip-card-front"]}>
                                <p className={styles.heading8264}>Your Digital Identity</p>
                                <div style={{display: "flex", justifyContent: "center", gap: 50, color: "black", fontWeight: "bold", fontSize: 14}}>
                                    <div>
                                        {userData.connectedWallets}
                                        <br />
                                        <br />
                                        CONNECTED
                                        <br />
                                        WEB3 WALLETS
                                    </div>
                                    <div>
                                        {userData.connectedSocials}
                                        <br />
                                        <br />
                                        LINKED
                                        <br />
                                        WEB2 SOCIALS
                                    </div>
                                </div>
                                <p className={styles.name}>ACCESS DAOs AND COMMUNITIES, VERIFY AND PROVE YOUR REPUTATION IN THE WEB3 SPACE</p>
                            </div>
                            <div className={styles["flip-card-back"]}>
                                <div className={styles.strip}></div>
                                <div style={{display: "flex", justifyContent: "center", gap: 50, color: "black", fontWeight: "bold", fontSize: 14}}>
                                    <div>
                                        {userData.upvotes}
                                        <br />
                                        <br />
                                        UPVOTES
                                    </div>
                                    <div>
                                        {userData.downvotes}
                                        <br />
                                        <br />
                                        DOWNVOTES
                                    </div>
                                </div>
                                <p className={styles.name}>UPVOTES AND DOWNVOTES REFLECT YOUR CURRENT REPUTATION IN THE WEB3 SPACE</p>
                            </div>
                        </div>
                    </div>
                    <div className={styles.carouselContainer}>
                        <h2 className={styles.carouselTitle}>Verified Interests</h2>
                        <div style={{color: "white", textAlign: "left", marginBottom: 20, fontSize: 14}}>The following are the interests that our AI agent has captured from your activity across your linked web2 platforms</div>
                        <div className={styles.carouselWrapper}>
                            {userData.verifiedInterests.map((interest : string) => (
                                <div className={styles.interestBox} key={interest}>
                                    {interest}
                                </div>
                            ))}
                            {userData.verifiedInterests.length === 0 && 
                                <div style={{color: "#7E57C2", textAlign: "left", marginBottom: 20, fontSize: 14}}>No verified interests found</div>
                            }
                        </div>
                    </div>
                    <div style={{marginTop: 10, width: 800, display: "flex", flexDirection: "column", gap: 20}}>
                        <h2 className={styles.carouselTitle}>Connected Web2 Social Platforms</h2>
                        {
                            userData.socialNetworks.length ?
                                userData.socialNetworks.map((network : any) => {
                                    if (network.name === "Twitter") {
                                        return (
                                            <div key={network.name}>
                                                <div style={{display: "flex", gap: 20, alignItems: "center", color: "white", paddingBottom: 20}}>  
                                                    <img src={Twitter.src} alt="Twitter" style={{width: 60, height: 50}} />
                                                    TWITTER
                                                </div>
                                                <div style={{color: "white",  border: "1px solid #7E57C2", borderRadius: 20, padding: 20}}>
                                                    <div>
                                                        <span style={{color: "#7E57C2"}}>Username:</span> {"demoaccount"/*network.username*/}
                                                    </div>
                                                    <div style={{marginTop: 6}}>
                                                        <span style={{color: "#7E57C2"}}>Followers:</span> {network.followers}
                                                    </div>
                                                    <div style={{marginTop: 6}}>
                                                        <span style={{color: "#7E57C2"}}>Joined Date:</span> {network.joinedDate}
                                                    </div>
                                                </div>
                                                <div style={{color: "white", marginBlock: 20, fontSize: 14, textAlign: "justify"}}>
                                                    Below you'll find the complete list of tweets that our AI agent has analyzed to determine your interests and reputation metrics.
                                                    <br />
                                                    <br />
                                                    <div style={{maxHeight: 400, overflowY: "auto"}}>
                                                        {
                                                            network.posts.map((post : any, i : number) => (
                                                                <TweetPost
                                                                    key={"twitterpost" + i}
                                                                    tweet={post} 
                                                                />
                                                            ))
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return null;
                                })
                            :
                                <div style={{color: "#7E57C2", textAlign: "left", marginBottom: 20, fontSize: 14}}>You have not connected any web2 social platforms yet</div>
                        }
                    </div>
                </div>
            }
         </div>
    );
}