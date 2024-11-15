"use client";

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains'; // add baseSepolia for testing if needed
import { ReactNode, useState } from 'react';
import { State, WagmiProvider } from 'wagmi';

import { getConfig } from '../wagmi'; // ensure the path is correct

export function Providers({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  // Check if API key is provided
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;
  if (!apiKey) {
    console.warn("OnchainKit API key is missing.");
  }

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={apiKey || ""} // Provide fallback for missing API key
          chain={base} // Change to baseSepolia for testing if needed
          config={{
            appearance: {
              name: 'My Pen Is Long', 
              logo: 'https://onchainkit.xyz/favicon/48x48.png?v4-19-24', 
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}