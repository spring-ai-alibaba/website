import React from 'react'
import styles from './styles.module.css'

const FloatingClouds: React.FC = () => {
  return (
    <div className={styles.cloudsContainer}>
      <div className={`${styles.cloud} ${styles.cloud1}`}>
        <div className={styles.cloudShape}>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
        </div>
      </div>
      <div className={`${styles.cloud} ${styles.cloud2}`}>
        <div className={styles.cloudShape}>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
        </div>
      </div>
      <div className={`${styles.cloud} ${styles.cloud3}`}>
        <div className={styles.cloudShape}>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
        </div>
      </div>
      <div className={`${styles.cloud} ${styles.cloud4}`}>
        <div className={styles.cloudShape}>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
          <div className={styles.cloudPart}></div>
        </div>
      </div>
    </div>
  )
}

export default FloatingClouds