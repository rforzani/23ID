"use client"

import Navbar from "@/components/navbar";
import { AuthProvider } from "./context/authcontext";
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  Chain
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { baseSepolia } from "viem/chains";
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import styles from "./page.module.css";

const config = getDefaultConfig({
  appName: '23ID',
  projectId: '4059ff38770f1650c73ef45641b31f24',
  chains: [baseSepolia],
});

const queryClient = new QueryClient();

export default function AppLayout({children} : {children: Reacts.ReactNode}) {
  return (
      <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
              <RainbowKitProvider>
                <AuthProvider>
                  <div className={styles.container}>
                    <Navbar />
                    {children}
                  </div>
                </AuthProvider>
              </RainbowKitProvider>
          </QueryClientProvider>
      </WagmiProvider>
  );
}