import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { SignProtocolClient, SpMode, EvmChains } from '@ethsign/sp-sdk';
import { createPublicClient, http, createWalletClient, custom } from 'viem';
import { scrollSepolia } from 'viem/chains';
import { DAO_ABI, DAO_CONTRACT } from '@/utils/DAOconstants';

// Function to generate hash of data
function generateHash(data) {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

// Initialize Sign Protocol client
const initializeSignClient = () => {
  const publicClient = createPublicClient({
    chain: scrollSepolia,
    transport: http()
  });

  return new SignProtocolClient(SpMode.OnChain, {
    chain: EvmChains.scrollSepolia,
    publicClient
  });
};

export async function POST(request) {
  try {
    const { modelName, modelData, account } = await request.json();
    
    if (!account) {
      throw new Error('Wallet address is required');
    }

    // Generate hashes
    const modelHash = generateHash(modelData);
    const datasetHash = generateHash(modelData.trainingData || {});
    
    // Save model file
    const modelsDir = join(process.cwd(), 'public', 'models');
    try {
      await mkdir(modelsDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    const filePath = join(modelsDir, `${modelName}.json`);
    await writeFile(filePath, JSON.stringify({
      ...modelData,
      modelHash,
      datasetHash,
      trainerAddress: account.toLowerCase()
    }, null, 2));

    // Create attestation - this will automatically trigger rewards in the smart contract
    const signClient = initializeSignClient();
    const timestamp = Math.floor(Date.now() / 1000);
    
    const attestationData = {
      schemaId: "0x70",
      data: {
        trainer: account.toLowerCase(),
        timestamp: timestamp
      },
      indexingValue: account.toLowerCase()
    };

    const attestationResponse = await signClient.createAttestation(attestationData);

    return NextResponse.json({ 
      message: 'Model saved and training submitted successfully',
      path: `/models/${modelName}.json`,
      modelHash,
      datasetHash,
      attestation: {
        schema: "onchain_evm_534351_0x70",
        data: attestationData.data,
        attestationId: attestationResponse.attestationId
      }
    });

  } catch (error) {
    console.error('Error in training process:', error);
    return NextResponse.json(
      { message: 'Error processing training', error: error.message },
      { status: 500 }
    );
  }
}