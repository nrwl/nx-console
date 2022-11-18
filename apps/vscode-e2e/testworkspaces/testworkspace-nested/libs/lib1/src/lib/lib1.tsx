import styles from './lib1.module.css';

/* eslint-disable-next-line */
export interface Lib1Props {}

export function Lib1(props: Lib1Props) {
  return (
    <div className={styles['container']}>
      <h1>Welcome to Lib1!</h1>
    </div>
  );
}

export default Lib1;
