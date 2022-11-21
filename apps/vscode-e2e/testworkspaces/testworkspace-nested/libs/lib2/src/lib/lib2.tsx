import styles from './lib2.module.css';

/* eslint-disable-next-line */
export interface Lib2Props {}

export function Lib2(props: Lib2Props) {
  return (
    <div className={styles['container']}>
      <h1>Welcome to Lib2!</h1>
    </div>
  );
}

export default Lib2;
