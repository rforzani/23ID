"use client"

import { useState } from "react";
import styles from "./page.module.css";
import axios from "axios";
import { cloudPath } from "@/config/config";

export default function Signup() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");

    const signup = async () => {
        if (password !== repeatPassword) {
            alert("Passwords do not match");
            return;
        }

        const res = await axios.post(`${cloudPath}/signup`, {username: username, email: email, password: password}, {withCredentials: true});

        if (res.data.type === "success") {
            alert("Account created successfully");
        } else {
            alert("Error creating account");
        }
    }

    return (
        <div>
            <div className={styles.card}>
                <div className={styles.card__content}>
                    <h1>CREATE AN ACCOUNT</h1>
                    <input
                        placeholder="Username...."
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={styles.input}
                        name="text"
                        type="text"
                    />
                    <input
                        placeholder="Email...."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ marginTop: "10px" }}
                        className={styles.input}
                        name="text"
                        type="text"
                    />
                    <input
                        placeholder="Password...."
                        className={styles.input}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ marginTop: "10px" }}
                        name="password"
                        type="password"
                    />
                    <input
                        placeholder="Repeat Password...."
                        className={styles.input}
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        style={{ marginTop: "10px" }}
                        name="password"
                        type="password"
                    />
                    <button className={styles.btn} onClick={() => signup()}>
                        <span className={styles.text}>Submit</span>
                    </button>
                </div>
            </div>
        </div>
    );
}