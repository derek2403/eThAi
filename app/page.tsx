"use client";

<<<<<<< HEAD
import React from "react";
import { WalletComponents } from "@/components/Wallet";
import { CheckoutComponent } from "@/components/Checkout";
import ThreeBackground from "@/components/Background";
=======
import React from 'react';
import { Header } from '@/components/Header';
import styles from '../styles/landing.module.css';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
>>>>>>> e402da91f46216815e26f320060aeac5fb18d936

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
<<<<<<< HEAD
    <div className="relative">
      <ThreeBackground />
      <div className="absolute top-0 left-0 w-full p-6 z-10">
        {/* Navigation Bar */}
        <header className="flex justify-between items-center max-w-[1440px] mx-auto">
          {/* Project Name */}
          <div className="text-2xl font-bold text-white">
            eThAi
          </div>
          {/* Navigation Links */}
          <nav className="flex space-x-16">
            <a href="#web3" className="text-white hover:underline">Web3</a>
            <a href="#services" className="text-white hover:underline">Services</a>
            <a href="#solutions" className="text-white hover:underline">Solutions</a>
            <a href="#company" className="text-white hover:underline">Company</a>
            <a href="#resources" className="text-white hover:underline">Resources</a>
            <a href="#contact" className="text-white hover:underline">Contact Us</a>
          </nav>
        </header>

        {/* Buttons */}
        <div className="flex flex-col items-end mt-4 space-y-4">
          <div className="w-36">
            <WalletComponents />
          </div>
          <div className="w-36">
            <CheckoutComponent />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex flex-col items-center justify-center mt-32 text-center text-white">
          <h1 className="text-8xl font-bold">Powerful GPU compute solutions on-demand</h1>
          <p className="mt-8 text-3xl max-w-3xl">
            Accelerate growth and get closer to the edge with Aethir's distributed cloud compute infrastructure.
          </p>
        </main>
=======
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
>>>>>>> e402da91f46216815e26f320060aeac5fb18d936
      </div>
    </div>
  );
};

export default Page;