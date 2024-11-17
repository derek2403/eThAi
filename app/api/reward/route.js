import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
const platformWallet = new ethers.Wallet(process.env.NEXT_PUBLIC_AI_PRIVATE_KEY, provider);

export async function GET() {
  try {
    const balance = await provider.getBalance(platformWallet.address);
    const formattedBalance = ethers.formatEther(balance);

    return NextResponse.json({
      success: true,
      balance: formattedBalance,
      address: platformWallet.address
    });
  } catch (error) {
    console.error('GET /api/reward error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet info' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { address, contributionScore } = body;

    // Validate input
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    if (typeof contributionScore !== 'number' || contributionScore < 0 || contributionScore > 100) {
      return NextResponse.json(
        { error: 'Invalid contribution score' },
        { status: 400 }
      );
    }

    // Calculate reward based on score (0.001 ETH per point)
    const baseReward = ethers.parseEther('0.001');
    const reward = baseReward * BigInt(Math.floor(contributionScore));

    // Send transaction
    const tx = await platformWallet.sendTransaction({
      to: address,
      value: reward
    });

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    // Get updated balance
    const newBalance = await provider.getBalance(platformWallet.address);
    const formattedBalance = ethers.formatEther(newBalance);

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      transactionLink: `${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${receipt.hash}`,
      balance: formattedBalance
    });


  } catch (error) {
    console.error('POST /api/reward error:', error);
    return NextResponse.json(
      { error: 'Failed to process reward' },
      { status: 500 }
    );
  }
}