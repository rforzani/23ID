"use client"

import { useContext, useState } from "react";
import styles from "./page.module.css";
import axios from "axios";
import { cloudPath } from "@/config/config";
import {  useRouter } from "next/navigation";
import AuthContext from "../context/authcontext";

export default function Login() {
    const router = useRouter();

    const { setIsAuthenticated } = useContext(AuthContext);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const login = async () => {
        if (username && password) {
            let res = await axios.post(`${cloudPath}/login`, {username: username, password: password}, {withCredentials: true});
            if (res.data.type === "success") {
                setIsAuthenticated(true);
                router.replace("/dashboard");
            } else {
                alert(res.data.message);
            }
        } else {
            alert("Please fill in all fields");
        }
    }

    return (
        <div>
            <div className={styles.card}>
                <div className={styles.card__content}>
                    <h1>LOGIN</h1>
                    <input
                        placeholder="Username...."
                        className={styles.input}
                        name="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
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
                        <button className={styles.btn} onClick={() => login()}>
                            <span className={styles.text}>Submit</span>
                        </button>
                </div>
            </div>
        </div>
    );
}