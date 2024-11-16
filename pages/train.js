import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import { storeModelOnChain } from '../utils/contractInteraction';
import LZString from 'lz-string';
import { DecisionTree } from '@/model/DecisionTree';
import pako from 'pako';
import { saveModelLocally } from '../utils/modelStorage';

const AMOY_CHAIN_ID = "0x13882"; // 1256247 in decimal

// Add this function before storeModelOnChain
const compressModelData = async (model) => {
  try {
    // Convert model to string if it's not already
    const modelString = typeof model === 'string' ? model : JSON.stringify(model);
    
    // Convert string to Uint8Array
    const modelData = new TextEncoder().encode(modelString);
    
    // Compress the data
    const compressedData = pako.deflate(modelData);
    
    // Convert to hex string for blockchain storage
    const hexString = '0x' + Array.from(compressedData)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return hexString;
  } catch (error) {
    console.error('Error compressing model data:', error);
    throw error;
  }
};

export default function Train() {
  const [isTraining, setIsTraining] = useState(true);
  const [trainingResults, setTrainingResults] = useState(null);
  const [selectedSplit, setSelectedSplit] = useState(null);
  const [trainerAddress, setTrainerAddress] = useState('');
  const [storeError, setStoreError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const initializeTraining = async () => {
      try {
        // Get selected split and wallet address
        const splitIndex = localStorage.getItem('selectedSplitIndex');
        const splits = JSON.parse(localStorage.getItem('splitDatasets'));
        const split = splits[splitIndex];
        setSelectedSplit(split);

        // Get wallet address
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setTrainerAddress(address);
        }

        // Get training data and train model
        const trainingData = split.datasets[0].data;
        console.log('Training data sample:', trainingData[0]);

        const model = new DecisionTree(trainingData);
        
        // Use a ref to track if the effect has run
        let isSubscribed = true;

        setTimeout(async () => {
          try {
            if (!isSubscribed) return;

            // Check if split is already trained
            const splitIndex = localStorage.getItem('selectedSplitIndex');
            const splits = JSON.parse(localStorage.getItem('splitDatasets'));
            if (splits[splitIndex].trainedBy) {
              console.log('Split already trained by:', splits[splitIndex].trainedBy);
              setStoreError('This split has already been trained');
              return;
            }

            const results = model.train();
            console.log('Training results:', results);
            setTrainingResults(results);
            setIsTraining(false);

            if (window.ethereum) {
              // Check network
              const chainId = await window.ethereum.request({ method: 'eth_chainId' });
              console.log('Current chainId:', chainId);
              
              if (chainId !== '0x13882') { // Mumbai testnet
                setStoreError('Please connect to Mumbai testnet');
                return;
              }

              // Check balance
              const provider = new ethers.BrowserProvider(window.ethereum);
              const signer = await provider.getSigner();
              const address = await signer.getAddress();
              const balance = await provider.getBalance(address);
              
              // Convert balance to number and check if it's zero
              const balanceInEther = Number(ethers.formatEther(balance));
              console.log('Wallet balance:', balanceInEther, 'MATIC');
              
              if (balanceInEther <= 0) {
                setStoreError('Insufficient funds. Please add MATIC to your wallet.');
                return;
              }

              const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
              const modelName = `WM_${timestamp}`;
              const datasetName = "Weather_2023";
              
              try {
                // Save model locally first
                const modelPath = await saveModelLocally(modelName, model);
                console.log('Model saved locally at:', modelPath);

                // Then proceed with blockchain storage
                const txHash = await storeModelOnChain(modelName, datasetName, {
                  mse: results.mse || 0.000001,
                  rmse: results.rmse || 0.000001,
                  rSquared: results.rSquared || 0.000001
                });

                console.log('Model stored on chain:', txHash);

                // Update localStorage
                const splitIndex = localStorage.getItem('selectedSplitIndex');
                const splits = JSON.parse(localStorage.getItem('splitDatasets'));
                splits[splitIndex] = {
                  ...splits[splitIndex],
                  trainedBy: address,
                  metrics: results,
                  modelName,
                  txHash
                };
                localStorage.setItem('splitDatasets', JSON.stringify(splits));

                // Redirect to results
                router.push('/results');

              } catch (txError) {
                console.error('Transaction error:', txError);
                setStoreError(txError.message);
              }
            }

          } catch (error) {
            console.error('Training error:', error);
            setIsTraining(false);
            setStoreError(error.message);
          }
        }, 5000);

        // Cleanup function
        return () => {
          isSubscribed = false;
        };

      } catch (error) {
        console.error('Error initializing training:', error);
        setIsTraining(false);
      }
    };

    // Only run once when component mounts
    let mounted = true;
    if (mounted) {
      initializeTraining();
    }
    return () => {
      mounted = false;
    };
  }, []); // Remove trainerAddress from dependencies

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6">
          <h2 className="text-2xl font-bold mb-4">Model Training</h2>
          
          {isTraining ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Training in progress...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Trainer Address</p>
                    <p className="font-mono">{trainerAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dataset Name</p>
                    <p>{selectedSplit?.datasets[0].name}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-sm text-gray-500 mb-2">RMSE</h3>
                  <p className="text-2xl font-semibold">{trainingResults?.rmse.toFixed(4)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-sm text-gray-500 mb-2">MSE</h3>
                  <p className="text-2xl font-semibold">{trainingResults?.mse.toFixed(4)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-sm text-gray-500 mb-2">R² Score</h3>
                  <p className="text-2xl font-semibold">{trainingResults?.rSquared.toFixed(4)}</p>
                </div>
              </div>

              {storeError && (
                <div className="bg-red-50 rounded-lg p-6">
                  <h3 className="text-sm text-red-500 mb-2">Error</h3>
                  <p className="text-sm">{storeError}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
