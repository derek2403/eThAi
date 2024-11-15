"use client"; // Ensure this file is treated as a Client Component

import React from "react";
import WalletComponents from "../components/Wallet";

export default function Home() {
  return (
    <div className="relative h-screen w-screen">
      {/* Project Name on the Top Left */}
      <div className="absolute top-5 left-5 text-xl font-bold text-white bg-gradient-to-r from-blue-400 to-blue-600 px-3 py-1 rounded-lg">
        eThAi
      </div>

      {/* Wallet and Pay Button Container on the Top Right */}
      <div className="absolute top-5 right-5 flex flex-col items-end gap-3">
        <WalletComponents />
        <button
          className="bg-gradient-to-r from-blue-500 to-blue-300 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:from-blue-400 hover:to-blue-200"
        >
          Pay with Crypto
        </button>
      </div>
    </div>
  );
}
