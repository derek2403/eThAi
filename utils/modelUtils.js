import { ethers } from 'ethers';
import LZString from 'lz-string';

export async function getStoredModel(modelId) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    [
      "function getModel(bytes32 modelId) public view returns (string memory compressedModel, address trainer, uint256 timestamp, string memory datasetName, string memory metrics)"
    ],
    provider
  );

  const [compressedModel, trainer, timestamp, datasetName, metrics] = await contract.getModel(modelId);

  return {
    model: JSON.parse(LZString.decompressFromUTF16(compressedModel)),
    trainer,
    timestamp: Number(timestamp),
    datasetName,
    metrics: JSON.parse(metrics)
  };
} 