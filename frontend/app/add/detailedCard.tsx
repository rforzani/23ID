import Checkbox from './checkbox';
import styles from './detailedCard.module.css';
import Loader from './loader';

export default function DetailedCard({ src, onClose, progress, date = new Date() }: { src: string; onClose: () => void, progress: number, date?: Date }) {
  return (
    <div className={styles.card}>
      <div style={{width: "100%", position: "absolute", top: 10, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "sans-serif", letterSpacing: 1.3}}>
        {parseInt(progress as any) !== 100 ?
          <>
            <p>Syncing your Twitter account with your digital identity...</p>
            <div style={{position: "absolute", top: 100}}>
              <Loader progress={progress} />
            </div>
          </>
        :
          <>
            <p>Your Twitter account was last synced with your digital identity on {date.toDateString()}</p>
            <div style={{marginTop: 30}}>
              <Checkbox />
            </div>
          </>
        }
      </div>
      <button className={styles.closeButton} onClick={onClose}>
        &times;
      </button>
      <img src={src} alt="" className={styles.image} />
      <div className={styles.heading}></div>
    </div>
  );
}