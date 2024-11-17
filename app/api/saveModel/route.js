import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';


// Function to generate hash of data
function generateHash(data) {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

// Track processed attestations to prevent duplicates
const processedAttestations = new Set();

export async function POST(request) {
  try {
    const { modelName, modelData, attestationId } = await request.json();
    
    // Check if this attestation was already processed
    if (attestationId && processedAttestations.has(attestationId)) {
      return NextResponse.json(
        { message: 'Attestation already processed' },
        { status: 400 }
      );
    }

    // Generate hashes
    const modelHash = generateHash(modelData);
    const datasetHash = generateHash(modelData.trainingData || {});
    
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

    // Format attestation data according to schema
    const attestation = {
      schema: "onchain_evm_534351_0x6e",
      data: {
        ModelHash: modelHash,      // Match schema case
        datasetHash: datasetHash,
        modelName: modelName,
        timestamp: Math.floor(Date.now() / 1000) // Unix timestamp in seconds
      }
    };

    // Track this attestation if an ID was provided
    if (attestationId) {
      processedAttestations.add(attestationId);
    }

    return NextResponse.json({ 
      message: 'Model saved successfully',
      path: `/models/${modelName}.json`,
      modelHash,
      datasetHash,
      attestation
    });

  } catch (error) {
    console.error('Error saving model:', error);
    return NextResponse.json(
      { message: 'Error saving model', error: error.message },
      { status: 500 }
    );
  }
}