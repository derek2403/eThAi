"use client"; // Ensure this file is treated as a Client Component

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  Name,
  Identity,
} from "@coinbase/onchainkit/identity";

import { color } from "@coinbase/onchainkit/theme";

// Wallet Component
export function WalletComponents() {
  return (
    <div className="w-full">
      <Wallet>
        <ConnectWallet>
          <div className="bg-[rgba(30,41,59,0.8)] backdrop-blur-sm w-full text-white rounded-xl px-4 py-2.5 flex items-center justify-center space-x-2 hover:bg-[rgba(30,41,59,0.9)] transition-all duration-300 border border-[rgba(125,178,220,0.2)] shadow-[0_0_15px_rgba(143,209,237,0.15)]">
            <Avatar className="h-6 w-6" />
            <Name />
          </div>
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address className={color.foregroundMuted} />
          </Identity>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}

// Adding Default Export
export default WalletComponents;
