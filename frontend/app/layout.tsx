import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import AppLayout from "./appLayout";

const dmSans = DM_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "23ID",
  description: "A repuation digital identity NFT platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.className}`}>
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
