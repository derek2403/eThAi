import { ethers } from 'ethers';

export const saveModelLocally = async (modelName, model, address) => {
  try {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    // Create a signature for model verification
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const message = `Saving model: ${modelName} at ${Date.now()}`;
    const signer = await provider.getSigner(address);
    const signature = await signer.signMessage(message);

    // Extract and format model data
    const modelData = {
      tree: {
        feature: model.feature,
        threshold: model.threshold,
        left: model.left,
        right: model.right,
        value: model.value
      },
      labelEncoder: model.labelEncoder || {
        'sunny': 0,
        'rainy': 1,
        'cloudy': 2,
        'stormy': 3
      },
      metadata: {
        createdBy: address,
        createdAt: new Date().toISOString(),
        signature: signature,
        message: message
      }
    };

    // Send to API
    const response = await fetch('/api/saveModel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wallet-Address': address
      },
      body: JSON.stringify({
        modelName,
        modelData,
        signature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save model file');
    }

    const result = await response.json();
    
    // Store in localStorage with wallet info
    localStorage.setItem('aggregatedModel', JSON.stringify({
      model: { tree: modelData.tree },
      labelEncoder: { condition: modelData.labelEncoder },
      metadata: {
        owner: address,
        savedAt: new Date().toISOString(),
        modelPath: result.path
      }
    }));

    console.log(`Model saved successfully at ${result.path}`);
    return result.path;

  } catch (error) {
    console.error('Error saving model locally:', error);
    throw new Error(`Failed to save model: ${error.message}`);
  }
}; 