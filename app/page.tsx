"use client";

import React from 'react';
import { Header } from '@/components/Header';
import styles from '../styles/landing.module.css';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';

const Page = () => {
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
        <div ref={mountRef} className={styles.landingRight}></div>
      </div>
    </div>
  );
};

export default Page;
