"use client";  // Treat this as a Client Component

import React from 'react';
import { WalletComponents } from '@/components/Wallet';
import { CheckoutComponent } from '@/components/Checkout';

const Page = () => {
  return (
    <div>
      <WalletComponents />
      <CheckoutComponent />
    </div>
  );
};

export default Page;
