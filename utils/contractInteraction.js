import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x356ED74eE51e4aa5f1Ce9B51329fecEF728621bc';
const CONTRACT_ABI = [
  "function storeModel(string memory modelName, string memory datasetName, uint256 mse, uint256 rmse, uint256 rSquared) public"
];

export const storeModelOnChain = async (modelName, datasetName, metrics) => {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Check if transaction is already pending for this model
    const nonce = await provider.getTransactionCount(signer.address, 'latest');
    
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer
    );

    // Format metrics as integers (remove decimals)
    const metricsForContract = {
      modelName,
      datasetName,
      mse: Math.floor(metrics.mse * 1e6),
      rmse: Math.floor(metrics.rmse * 1e6),
      rSquared: Math.floor(metrics.rSquared * 1e6)
    };

    // First check if model is already stored
    try {
      const isStored = await contract.isModelStored(modelName);
      if (isStored) {
        console.log('Model already stored on chain');
        return null;
      }
    } catch (error) {
      console.log('Error checking model status:', error);
    }

    // Send transaction with specific nonce
    const tx = await contract.storeModel(
      metricsForContract.modelName,
      metricsForContract.datasetName,
      metricsForContract.mse.toString(),
      metricsForContract.rmse.toString(),
      metricsForContract.rSquared.toString(),
      {
        nonce: nonce,
        value: 0
      }
    );

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);
    return receipt.hash;

  } catch (error) {
    // Check if error is due to user rejection
    if (error.code === 4001) {
      throw new Error('Transaction rejected by user');
    }
    
    // Check if error is due to already pending transaction
    if (error.message.includes('nonce')) {
      throw new Error('Transaction already pending. Please wait or reset MetaMask.');
    }

    console.error('Transaction error:', error);
    throw new Error('Failed to store model on chain. Please try again.');
  }
}; 

export const splitDataset = async (randomNumber, address) => {
  try {
    if (!window.ethereum) throw new Error('No wallet detected');
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Contract setup
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer
    );

    // Get the required fee from the contract
    const fee = await contract.getFee();
    
    // Estimate gas
    const gasEstimate = await contract.splitDataset.estimateGas(
      randomNumber,
      { value: fee }
    );

    // Add 20% buffer to gas estimate
    const gasLimit = Math.floor(gasEstimate * 1.2);

    // Send transaction with fee
    const tx = await contract.splitDataset(
      randomNumber,
      {
        value: fee,
        gasLimit: gasLimit
      }
    );

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return receipt.hash;
  } catch (error) {
    console.error('Split dataset error:', error);
    if (error.reason === 'Insufficient fee') {
      throw new Error('Please send the required fee to split the dataset');
    }
    throw error;
  }
}; 