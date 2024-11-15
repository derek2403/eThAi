"use client";

import { 
    Checkout, 
    CheckoutButton, 
    CheckoutStatus } 
from '@coinbase/onchainkit/checkout';

import type { LifecycleStatus } from '@coinbase/onchainkit/checkout'; 
 
const statusHandler = async (status: LifecycleStatus) => { 
  const { statusName, statusData } = status; 
  if (statusName === 'success') {
    const { chargeId } = statusData; 
    const options = { 
      method: 'GET', 
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json', 
        'X-CC-Api-Key': '2fc3b2e4-4a39-419f-82ee-f54dfb7b155d'
      } 
    }; 
    try {
      const response = await fetch(`https://api.commerce.coinbase.com/charges/${chargeId}`, options);
      const data = await response.json();
      console.log('Payment successful:', data);
      // Add success handling logic here
    } catch (error) {
      console.error('Error verifying payment:', error);
      // Add error handling logic here
    }
  }
} 

export function CheckoutComponent() {
    return (
        <div>
            <Checkout productId='31201d52-87ce-4283-8e90-4dd74654d84f' onStatus={statusHandler}> 
                <CheckoutButton coinbaseBranded/> 
                <CheckoutStatus/>
            </Checkout>
        </div>
    );
}