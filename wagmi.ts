import { http, cookieStorage, createConfig, createStorage } from 'wagmi';
import { base } from 'wagmi/chains'; // add baseSepolia if needed
import { coinbaseWallet } from 'wagmi/connectors';

export function getConfig() {
  return createConfig({
    chains: [base], // add baseSepolia for testing if needed
    connectors: [
      coinbaseWallet({
        appName: "OnchainKit",
        preference: 'smartWalletOnly',
        version: '4',
      }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [base.id]: http(), // add baseSepolia if needed
    },
  });
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}