'use client'

import { WagmiProvider, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { createPublicClient, http } from 'viem'

const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL)
  }
})

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WagmiProvider config={config}>
          {children}
        </WagmiProvider>
      </body>
    </html>
  )
} 
