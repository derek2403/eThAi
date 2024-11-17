"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { Card, CardBody, CardHeader, Progress } from "@nextui-org/react";
import { storeModelOnChain } from '../../utils/contractInteraction';
import { DecisionTree } from '@/model/DecisionTree';
import pako from 'pako';
import { Link } from 'next/link';
import { saveModelLocally } from '../../utils/modelStorage';
import { WalletComponents } from '../../components/WalletProvider';

import styles from '../../styles/train.css';
import { Header } from '../../components/Header';
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
              const datasetName = split.datasets[0].name || "Weather_2023";
              
              try {
                // Save model locally with API
                const modelData = {
                  tree: model.tree || {},
                  labelEncoder: model.labelEncoder || {}
                };
                
                const saveModelResponse = await fetch('/api/saveModel', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    modelName,
                    modelData
                  })
                });

                if (!saveModelResponse.ok) {
                  const errorData = await saveModelResponse.json();
                  throw new Error(errorData.message || 'Failed to save model');
                }

                const { path: modelPath } = await saveModelResponse.json();
                console.log('Model saved locally at:', modelPath);

                // Store on blockchain
                const compressedModel = await compressModelData(model);
                const txHash = await storeModelOnChain(modelName, datasetName, {
                  mse: results.mse || 0.000001,
                  rmse: results.rmse || 0.001,
                  rSquared: results.rSquared || 0.5
                });

                console.log('Model stored on chain:', txHash);

                // Update localStorage with both modelPath and txHash
                splits[splitIndex] = {
                  ...split,
                  trainedBy: address,
                  metrics: results,
                  modelName,
                  modelPath,
                  txHash
                };
                localStorage.setItem('splitDatasets', JSON.stringify(splits));

                // Store training completion data for rewards
                localStorage.setItem('trainingCompletion', JSON.stringify({
                  trainerAddress: address,
                  timestamp: new Date().toISOString(),
                  modelName,
                  txHash,
                  pendingReward: true
                }));

                // Navigate to CDP page instead of results
                router.push('/cdp');

              } catch (error) {
                console.error('Error:', error);
                setStoreError(error.message);
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
    <div className="training-container">
      <Header />
      {isTraining ? (
        <div className="loading-screen">
          <div className="cube-grid">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="cube"></div>
            ))}
          </div>
          <div className="loading-text">
            <h2>Training in Progress</h2>
            <div className="progress-bar">
              <Progress
                size="sm"
                isIndeterminate
                aria-label="Loading..."
                className="max-w-md"
                color="primary"
              />
            </div>
            <p>Please wait while we train your model</p>
          </div>
        </div>
      ) : (
        <div className="results-display">
          <Card className="results-card">
            <CardHeader className="results-header">
              <h2>Training Results</h2>
            </CardHeader>
            <CardBody>
              <div className="info-section">
                <div className="info-row">
                  <div className="info-label">Trainer Address</div>
                  <div className="info-value monospace">{trainerAddress}</div>
                </div>
                <div className="info-row">
                  <div className="info-label">Dataset Name</div>
                  <div className="info-value">{selectedSplit?.datasets[0].name}</div>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20V10" />
                      <path d="M18 20V4" />
                      <path d="M6 20v-4" />
                    </svg>
                  </div>
                  <div className="metric-value">{trainingResults?.rmse.toFixed(4)}</div>
                  <div className="metric-label">RMSE</div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 21H3" />
                      <path d="M21 3v18" />
                      <path d="M3 21V3" />
                    </svg>
                  </div>
                  <div className="metric-value">{trainingResults?.mse.toFixed(4)}</div>
                  <div className="metric-label">MSE</div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16V8" />
                      <path d="M12 8l4 4" />
                      <path d="M12 8l-4 4" />
                    </svg>
                  </div>
                  <div className="metric-value">{trainingResults?.rSquared.toFixed(4)}</div>
                  <div className="metric-label">R² Score</div>
                </div>
              </div>

              {storeError && (
                <div className="error-message">
                  <div className="error-icon">⚠️</div>
                  <p>{storeError}</p>
                </div>
              )}
            </CardBody>
          </Card>
          
        </div>
      )}
      

    </div>

  );
}
