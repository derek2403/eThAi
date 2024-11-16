import { ethers } from 'ethers';

const ModelStorageABI = [
  "function storeModel(string memory compressedModel, string memory datasetName, string memory metrics) public returns (bytes32)",
  "function getModel(bytes32 modelId) public view returns (string memory compressedModel, address trainer, uint256 timestamp, string memory datasetName, string memory metrics)"
];

export const CONTRACT_ADDRESS = "0x594794c9ba0BaEC3e9610a1652BF82BD5Bb89d52";

export async function getModelStorageContract(signer) {
  if (!signer) {
    throw new Error('No signer provided');
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ModelStorageABI, signer);
  
  const code = await signer.provider.getCode(CONTRACT_ADDRESS);
  if (code === '0x') {
    throw new Error('No contract deployed at the specified address');
  }

  return contract;
}

export async function storeModelOnChain(signer, modelName, datasetName, metrics) {
  try {
    const contract = await getModelStorageContract(signer);
    
    const gasEstimate = await contract.storeModel.estimateGas(
      modelName,
      datasetName,
      metrics
    );

    const gasLimit = Math.floor(gasEstimate * 1.2);

    const tx = await contract.storeModel(
      modelName,
      datasetName,
      metrics,
      { gasLimit }
    );

    return await tx.wait();
  } catch (error) {
    console.error('Contract interaction error:', error);
    throw error;
  }
}

export async function validateNetwork(signer) {
  const network = await signer.provider.getNetwork();
  console.log('Connected to network:', {
    chainId: network.chainId,
    name: network.name
  });
  
  const EXPECTED_CHAIN_ID = 80001; // Polygon Mumbai testnet
  if (network.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Please connect to the correct network. Expected chain ID: ${EXPECTED_CHAIN_ID}`);
  }
} 