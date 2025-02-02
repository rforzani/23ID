import styles from './detailedCard.module.css';

export default function WalletDetailedCard({ onClose, wallets, adminWallet, onConnectMore }: { onClose: () => void, wallets: Array<string>, adminWallet: string, onConnectMore: () => void }) {
  return (
    <div className={styles.card}>
      <div style={{width: "100%", position: "absolute", top: 10, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "sans-serif", letterSpacing: 1.3}}>
        <div style={{width: "80%", marginTop:30}}>YOUR LINKED WALLETS</div>
        <div style={{color: "white", width: "80%", marginTop: 20}}>You have {wallets.length} {wallets.length > 1 ? "wallets" : "wallet"} linked to your account.</div>
        <div style={{width: "80%", marginTop: 20, display: "flex", flexDirection: "row"}}>
            <button style={{backgroundColor: "#7225be", color: "white", border: "none", padding: 10, borderRadius: 5, fontSize: 15, letterSpacing: 0.4, cursor: "pointer"}} onClick={onConnectMore}>Link a new wallet</button>
        </div>
        <div style={{width: "80%", borderBottom: "0.5px solid white", paddingBottom: 20,}}></div>
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", width: "100%"}}>
            {wallets.map((wallet, index) => {
                return (
                    <div key={wallet} style={{ width: "80%", marginTop: 20, display: "flex", flexDirection: "row", alignItems: "center"}}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="35"
                            viewBox="0 0 48 48"
                            height="35"
                        >
                            <path fill="none" d="M0 0h48v48H0z"></path>
                            <path
                                fill="#7225be"
                                d="M42 36v2c0 2.21-1.79 4-4 4H10c-2.21 0-4-1.79-4-4V10c0-2.21 1.79-4 4-4h28c2.21 0 4 1.79 4 4v2H24c-2.21 0-4 1.79-4 4v16c0 2.21 1.79 4 4 4h18zm-18-4h20V16H24v16zm8-5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"
                            ></path>
                        </svg>
                        <div style={{marginLeft: 20, color: "#7225be"}}>{wallet} {wallet === adminWallet && "(PRIMARY)"}</div>
                        {wallet !== adminWallet &&
                            <button style={{marginLeft: 20, backgroundColor: "#7225be", color: "white", border: "none", padding: 10, borderRadius: 5}}>Remove</button>
                        }   
                    </div>
                )
            })}
        </div>
      </div>
      <button className={styles.closeButton} onClick={onClose}>
        &times;
      </button>
      <div className={styles.heading}></div>
    </div>
  );
}