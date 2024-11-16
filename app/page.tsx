"use client";

import React from "react";
import { WalletComponents } from "@/components/Wallet";
import { CheckoutComponent } from "@/components/Checkout";
import ThreeBackground from "@/components/Background";

const Page = () => {
  return (
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
      </div>
    </div>
  );
};

export default Page;