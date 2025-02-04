"use client";

import React from "react";

// Example Tweet structure
interface Tweet {
  text: string;
  time: string;
  likes: number;
  views: number;
  userHandle?: string;
  avatarUrl?: string;
}

interface TweetPostProps {
  tweet: Tweet;
}

export function TweetPost({ tweet }: TweetPostProps) {
  // Format date for display
  const formattedDate = new Date(tweet.time).toLocaleString();

  return (
    <div
      style={{
        // Purple gradient background with white text
        background: "linear-gradient(135deg, #49356b, #7E57C2)",
        color: "#fff",
        padding: 16,
        borderRadius: 16,
        // A subtle border for definition
        border: "1px solid rgba(255, 255, 255, 0.15)",
        // Box shadow for depth
        boxShadow: "0 3px 8px rgba(0, 0, 0, 0.3)",
        // Hover animation
        transition: "all 0.2s ease",
        cursor: "default",
        maxWidth: 800,
        marginBottom: 24,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 6px 16px rgba(0, 0, 0, 0.35)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 3px 8px rgba(0, 0, 0, 0.3)";
      }}
    >
      {/* Header: Avatar + user info */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <img
          src={
            tweet.avatarUrl ||
            "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
          }
          alt="Avatar"
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            marginRight: 12,
            objectFit: "cover",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {"Name Hidden for Privacy"}
          </span>
          <span style={{ fontSize: 14, opacity: 0.85 }}>
            @{tweet.userHandle || "demoaccouunt"} · {formattedDate}
          </span>
        </div>
      </div>

      {/* Tweet text */}
      <div style={{ fontSize: 15, lineHeight: "20px", marginBottom: 12 }}>
        {tweet.text}
      </div>

      {/* Footer: Likes + Views */}
      <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
        {/* Likes */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="#FFD1DC" /* Pastel pink for the heart */
            viewBox="0 0 16 16"
          >
            <path d="M8 2.748-.717 9.583c-.98.975-.98 2.56 0 3.535.98.975 2.565.975 3.545 0L8 7.175l5.172 5.943c.98.975 2.565.975 3.545 0 .98-.975.98-2.56 0-3.535L8 2.748z" />
          </svg>
          <span style={{ fontSize: 14 }}>{tweet.likes}</span>
        </div>

        {/* Views */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="#FFEDB5" /* Pastel yellow for views */
            viewBox="0 0 16 16"
          >
            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zm-8 4a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
          </svg>
          <span style={{ fontSize: 14 }}>{tweet.views}</span>
        </div>
      </div>
    </div>
  );
}
