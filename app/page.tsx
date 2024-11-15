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
        <div className="flex justify-between items-start max-w-[1440px] mx-auto">
          {/* Project Name */}
          <div className="text-2xl font-bold text-white hover:scale-105 transition-transform duration-300 ease-in-out">
            eThAi
          </div>
          
          {/* Wallet and Checkout Container */}
          <div className="flex flex-col items-end gap-4 w-[280px]">
            <WalletComponents />
            <CheckoutComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;