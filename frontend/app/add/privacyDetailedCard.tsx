import styles from './detailedCard.module.css';

export default function PrivacyDetailedCard({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.card}>
      <div style={{width: "100%", position: "absolute", top: 10, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "sans-serif", letterSpacing: 1.3}}>
        <div style={{width: "80%", marginTop:30,}}>YOUR PRIVACY MATTERS TO US.</div>
        <div style={{color: "white", width: "80%", marginBottom: 30, marginTop:30, letterSpacing: 1, lineHeight: 1.3, borderBottom: "0.5px solid white", paddingBottom: 20, textAlign: "justify"}}>When you connect a web2 social media profile to our platform, your sensitive data such as usernames, email addresses and phone numbers remain completely hidden. The only data we collect are completely anonymous metrics or posts that are fed into a custom AI agent used to generate your onchain unique reputation and digital identity NFT.</div>
      </div>
      <button className={styles.closeButton} onClick={onClose}>
        &times;
      </button>
      <div className={styles.heading}></div>
    </div>
  );
}