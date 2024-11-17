"use client";

import React from 'react';
import { Header } from '@/components/Header';
import styles from '../styles/landing.module.css';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { WalletProvider, useWallet } from '../components/WalletConnection';

// Separate ThreeJS component
const ThreeScene = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    const container = mountRef.current;
    if (!container) return;

    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.TorusKnotGeometry(3, 1, 100, 16);
    const material = new THREE.MeshNormalMaterial();
    const torusKnot = new THREE.Mesh(geometry, material);
    scene.add(torusKnot);

    camera.position.z = 10;

    const animate = () => {
      requestAnimationFrame(animate);
      torusKnot.rotation.x += 0.01;
      torusKnot.rotation.y += 0.01;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={styles.landingRight}></div>;
};

// Main content component with wallet integration
const MainContent = () => {
  const { address, connectWallet } = useWallet();

  const handleButtonClick = async (type: 'access' | 'provide') => {
    if (!address) {
      try {
        await connectWallet();
      } catch (error) {
        console.error('Error connecting wallet:', error);
        // You might want to show an error toast here
        return;
      }
    }
    
    // Handle navigation based on type
    if (type === 'access') {
      window.location.href = '/access';
    } else {
      window.location.href = '/provide';
    }
  };

  return (
    <div className={styles.landingContainer}>
      <div className={styles.landingLeft}>
        <div className={styles.landingLeftTop}>
          <h1>Powerful AI Aggregation Platform</h1>
          <p>
            Unlock AI's full potential with our platform, integrating blockchain 
            for secure, transparent, and decentralized access to models and data. 
            Simplify innovation with seamless, traceable AI resource management.
          </p>
        </div>
        <div className={styles.landingLeftBottom}>
          <button 
            className={styles.landingLeftBottomButton1}
            onClick={() => handleButtonClick('access')}
          >
            {address ? 'Access Compute' : 'Connect Wallet to Access'}
          </button>
          <button 
            className={styles.landingLeftBottomButton2}
            onClick={() => handleButtonClick('provide')}
          >
            {address ? 'Provide Compute' : 'Connect Wallet to Provide'}
          </button>
        </div>
      </div>
      <ThreeScene />
    </div>
  );
};

// Main page component
const Page = () => {
  return (
    <WalletProvider>
      <div>
        <Header />
        <MainContent />
      </div>
    </WalletProvider>
  );
};

export default Page;