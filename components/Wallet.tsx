"use client";

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Avatar,
  Name,
  Identity,
<<<<<<< HEAD
  Address, // Add this line
} from "@coinbase/onchainkit/identity";
=======
  EthBalance
} from '@coinbase/onchainkit/identity';
//import { EthBalance } from '@coinbase/onchainkit/balance';
import { WalletDropdownLink } from '@coinbase/onchainkit/wallet';
>>>>>>> 40511e5b29e2db0a9f31cc7bfb4b2df318a52748

// Wallet Component
export function WalletComponents() {
  return (
    <div className="w-full">
      <Wallet>
<<<<<<< HEAD
        <ConnectWallet>
          <div className="w-full text-white rounded-xl px-4 py-2.5 flex items-center justify-center space-x-2 hover:bg-[rgba(30,41,59,0.1)] transition-all duration-300 border border-[rgba(125,178,220,0.2)] shadow-[0_0_15px_rgba(143,209,237,0.15)]">
            <Avatar className="h-6 w-6" />
            <Name />
          </div>
=======
        <ConnectWallet withWalletAggregator>
          <Avatar className="h-6 w-6" />
          <Name />
>>>>>>> 40511e5b29e2db0a9f31cc7bfb4b2df318a52748
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
<<<<<<< HEAD
            <Address className="text-gray-400" />
=======
            <Address />
            <EthBalance />
>>>>>>> 40511e5b29e2db0a9f31cc7bfb4b2df318a52748
          </Identity>
          <WalletDropdownLink
            icon="wallet"
            href="https://keys.coinbase.com"
          >
            Wallet
          </WalletDropdownLink>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  );
<<<<<<< HEAD
}

export default WalletComponents;
=======
}
>>>>>>> e402da91f46216815e26f320060aeac5fb18d936
