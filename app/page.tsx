"use client";

import React from 'react';
import { Header } from '@/components/Header';
import styles from '../styles/landing.module.css';

const Page = () => {
  return (
    <div>
      <Header />
      <div className={styles.landingContainer}>
        <div className={styles.landingLeft}>
          <div className={styles.landingLeftTop}>
            <h1>Powerful GPU compute solutions on-demand</h1>
            <p>
              Accelerate growth and get closer to the edge with Aethir's distributed cloud compute infrastructure.
              We provide secure, cost-effective access to enterprise-grade GPUs around the world.
            </p>
          </div>
          <div className={styles.landingLeftBottom}>
            <button className={styles.landingLeftBottomButton1}>Access Compute</button>
            <button className={styles.landingLeftBottomButton2}>Provide Compute</button>
          </div>
        </div>
        <div className={styles.landingRight}>
          Taurus Knot
        </div>
      </div>
    </div>
  );
};

export default Page;
