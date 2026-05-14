import { formatSlotLabel } from "./transposedWeekUtils";
import styles from "./transposedWeek.module.css";

export function TransposedWeekHeader() {
  const hours = Array.from({ length: 24 }, (_, i) => i * 60);

  return (
    <>
      <div className={styles.headerCorner} />
      <div className={styles.headerTimes}>
        {hours.map((mins) => (
          <div key={mins} className={styles.hourCell}>
            {formatSlotLabel(mins)}
          </div>
        ))}
      </div>
    </>
  );
}
