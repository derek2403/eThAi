'use client';

import { WalletProvider } from '../components/WalletConnection';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  );
}