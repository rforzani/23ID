"use client"

import { useRouter } from "next/navigation";
import styles from "./navbar.module.css";
import { useContext } from "react";
import AuthContext from "@/app/context/authcontext";
import Logo from "./logo.png";
import Image from "next/image";
import axios from "axios";
import { cloudPath } from "@/config/config";

export default function Navbar() {
    const router = useRouter();
    const { isAuthenticated, isLoading, setIsAuthenticated } = useContext(AuthContext);

    const logout = async () => {
        await axios.get(`${cloudPath}/logout`, {withCredentials: true});   
        setIsAuthenticated(false);
        router.replace("/login");
    }
    
    if (isLoading) return;

    return (
        <div className={styles.card}>
            <div className={styles.card__content}>
                <Image src={Logo.src} alt="23ID" width={90} height={90} style={{borderRadius: 50, marginLeft: -23, border: "2px solid #AF40FF"}} />
                {!isAuthenticated ?
                    <>
                        <button className={styles.styledButton} style={{color: "white"}} onClick={() => router.push("/login")}>
                            Login
                        </button>
                        <button className={styles.styledButton} onClick={() => router.push("/signup")}>
                            Register Now
                        </button>
                    </>
                :
                    <>
                        <button className={styles.styledButton} style={{color: "white"}} onClick={() => logout()}>
                            Log Out
                        </button>
                        <div className={styles.plainBtn} onClick={() => router.push("/dashboard")}>
                            My Digital Identity
                        </div>
                        <div className={styles.plainBtn} onClick={() => router.push("/add")}>
                            Add to my Identity
                        </div>
                        <div className={styles.plainBtn} onClick={() => router.push("/settings")}>
                            Settings
                        </div>
                    </>
                }
                <div style={{color: "white", fontSize: 17, letterSpacing: 0.4, marginLeft: "auto", fontWeight: "bold", cursor: "pointer"}} onClick={() => router.push("/about")}>ABOUT 23ID</div>
            </div>
        </div>
    );
}