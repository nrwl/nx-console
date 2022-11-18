import styles from './lib1-nestedlib.module.css';

/* eslint-disable-next-line */
export interface Lib1NestedlibProps {}

export function Lib1Nestedlib(props: Lib1NestedlibProps) {
  return (
    <div className={styles['container']}>
      <h1>Welcome to Lib1Nestedlib!</h1>
    </div>
  );
}

export default Lib1Nestedlib;
