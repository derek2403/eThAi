import { http, cookieStorage, createConfig, createStorage } from 'wagmi';
import { base, sepolia } from 'wagmi/chains'; // add baseSepolia if needed
import {
  metaMaskWallet,
  rainbowWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';

export function getConfig() {
  const connectors = connectorsForWallets([
    {
      groupName: 'Recommended Wallet',
      wallets: [coinbaseWallet],
    },
    {
      groupName: 'Other Wallets',
      wallets: [rainbowWallet, metaMaskWallet],
    },
  ], {
    appName: "OnchainKit",
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
  });

  return createConfig({
    chains: [sepolia],
    connectors,
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [base.id]: http(),
      [sepolia.id]: http(),
    },
  });
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}