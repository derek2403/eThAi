import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { SignProtocolClient, SpMode, EvmChains } from '@ethsign/sp-sdk';
import { createPublicClient, http } from 'viem';
import { scrollSepolia } from 'viem/chains';

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

// Track processed attestations to prevent duplicates
const processedAttestations = new Set();

export async function POST(request) {
  try {
    const { modelName, modelData } = await request.json();
    
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
      datasetHash
    }, null, 2));

    // Create attestation using Sign Protocol
    const signClient = initializeSignClient();
    const attestationData = {
      schemaId: "0x6e", // Your schema ID for model attestations
      data: {
        ModelHash: modelHash,
        DatasetHash: datasetHash,
        ModelName: modelName,
        Timestamp: Math.floor(Date.now() / 1000)
      }
    };

    const attestationResponse = await signClient.createAttestation(attestationData);
    const attestationId = attestationResponse.attestationId;

    // Track this attestation
    processedAttestations.add(attestationId);

    // Format attestation data according to schema
    const attestation = {
      schema: "onchain_evm_534351_0x6e", // Match your schema ID
      data: attestationData.data,
      attestationId
    };

    // The schema hook will automatically trigger to add funds on the smart contract
    // based on the attestation creation

    return NextResponse.json({ 
      message: 'Model saved successfully',
      path: `/models/${modelName}.json`,
      modelHash,
      datasetHash,
      attestation,
      attestationId
    });

  } catch (error) {
    console.error('Error saving model:', error);
    return NextResponse.json(
      { message: 'Error saving model', error: error.message },
      { status: 500 }
    );
  }
}