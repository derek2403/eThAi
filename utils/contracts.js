import { ethers } from 'ethers';

const ModelStorageABI = [
  "function storeModel(string memory compressedModel, string memory datasetName, string memory metrics) public returns (bytes32)",
  "function getModel(bytes32 modelId) public view returns (string memory compressedModel, address trainer, uint256 timestamp, string memory datasetName, string memory metrics)"
];

export const CONTRACT_ADDRESS = "0x594794c9ba0BaEC3e9610a1652BF82BD5Bb89d52";

export function getModelStorageContract(signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, ModelStorageABI, signer);
} 