// app/split/page.js
"use client";

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { GENERATOR_ADDRESS, ABI } from '@/utils/constants';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import styles from '../../styles/split.css';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://nillion-storage-apis-v0.onrender.com';
const APP_ID = process.env.NEXT_PUBLIC_APP_ID;
const USER_SEED = process.env.NEXT_PUBLIC_USER_SEED || 'user_123';

export default function Split() {
  const [uploadedDataset, setUploadedDataset] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fee, setFee] = useState(null);
  const [numGroups, setNumGroups] = useState(5);
  const [splitDatasets, setSplitDatasets] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState('');
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [provider, setProvider] = useState(null);
  const [datasetStoreId, setDatasetStoreId] = useState(null);

  // Initialize provider and fee
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      try {
        const newProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_OP_SEPOLIA_RPC);
        setProvider(newProvider);
        
        const fetchFee = async () => {
          try {
            const contract = new ethers.Contract(GENERATOR_ADDRESS, ABI, newProvider);
            const requiredFee = await contract.getFee();
            setFee(requiredFee);
          } catch (err) {
            console.error('Error fetching fee:', err);
            setError('Failed to fetch required fee. Please refresh the page.');
          }
        };
        
        fetchFee();
      } catch (err) {
        console.error('Provider initialization error:', err);
        setError('Failed to connect to the network. Please check your connection.');
      }
    }
    
    return () => {
      // Cleanup
      setMounted(false);
    };
  }, []);

  // File upload handler
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      setTransactionStatus('Reading file...');

      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(new Error('File read failed: ' + error.message));
        reader.readAsText(file);
      });

      // Validate JSON structure
      const jsonData = JSON.parse(fileContent);
      if (!jsonData.datasets || !Array.isArray(jsonData.datasets) || !jsonData.datasets[0]?.data) {
        throw new Error('Invalid dataset format. Please ensure your JSON has the correct structure.');
      }

      // Store in Nillion
      setTransactionStatus('Storing dataset in Nillion...');
      const storeResponse = await fetch(`${API_BASE}/api/apps/${APP_ID}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: {
            nillion_seed: USER_SEED,
            secret_value: JSON.stringify(jsonData),
            secret_name: 'dataset',
          },
          permissions: {
            retrieve: [],
            update: [],
            delete: [],
            compute: {},
          },
        }),
      }).then(res => res.json());

      if (!storeResponse.store_id) {
        throw new Error('Failed to store dataset in Nillion');
      }

      setDatasetStoreId(storeResponse.store_id);
      setUploadedDataset(jsonData); // Keep this for UI feedback
      setTransactionStatus('Dataset stored successfully');

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Error processing file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate random sequence and split dataset
  const handleSplitRequest = async () => {
    if (!provider || !datasetStoreId || !fee) {
      setError('Please ensure all requirements are met before splitting');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSplitDatasets(null);
      setTransactionStatus('Initializing split request...');

      // Retrieve dataset from Nillion
      setTransactionStatus('Retrieving dataset from Nillion...');
      const retrieveResponse = await fetch(
        `${API_BASE}/api/secret/retrieve/${datasetStoreId}?retrieve_as_nillion_user_seed=${USER_SEED}&secret_name=dataset`
      ).then(res => res.json());

      if (!retrieveResponse.secret_value) {
        throw new Error('Failed to retrieve dataset from Nillion');
      }

      const dataset = JSON.parse(retrieveResponse.secret_value);

      // Get sequence from smart contract
      const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('Private key not configured');
      }

      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(GENERATOR_ADDRESS, ABI, wallet);

      // Generate random number for entropy
      setTransactionStatus('Generating random number...');
      const randomBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randomBytes);
      const userRandomNumber = '0x' + Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Request sequence from contract with longer timeout
      setTransactionStatus('Requesting sequence...');
      const dataLength = uploadedDataset.datasets[0].data.length;
      
      // Add transaction options with higher gas limit
      const txOptions = {
        value: fee,
        gasLimit: 500000, // Increased gas limit
      };

      const tx = await contract.requestSequence(dataLength, userRandomNumber, txOptions);
      
      setTransactionStatus('Waiting for transaction confirmation...');
      const receipt = await tx.wait();

      // Find sequence request event
      const sequenceRequestEvent = receipt.logs.find(log => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          return parsedLog.name === 'SequenceRequested';
        } catch {
          return false;
        }
      });

      if (!sequenceRequestEvent) {
        throw new Error('Sequence request event not found');
      }

      // Watch for sequence generation with improved timeout handling
      const parsedEvent = contract.interface.parseLog(sequenceRequestEvent);
      const sequenceNumber = parsedEvent.args.sequenceNumber;

      setTransactionStatus('Waiting for sequence generation...');

      // Increased timeout duration and better error handling
      const sequence = await new Promise((resolve, reject) => {
        let timeoutId;
        let eventListener;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (eventListener) contract.removeListener('SequenceGenerated', eventListener);
        };

        eventListener = (resultSequence, numbers) => {
          if (resultSequence.toString() === sequenceNumber.toString()) {
            cleanup();
            resolve(Array.from(numbers).map(n => n.toString()));
          }
        };

        contract.on('SequenceGenerated', eventListener);

        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('Sequence generation timed out. Please try again with a smaller dataset or fewer partitions.'));
        }, 120000); // Increased to 2 minutes
      });

      // Split dataset using sequence
      setTransactionStatus('Splitting dataset...');
      const splits = splitDatasetBySequence(sequence);
      setSplitDatasets(splits);
      
      // Store splits in localStorage and redirect
      localStorage.setItem('splitDatasets', JSON.stringify(splits));
      setTransactionStatus('Split successful! Redirecting...');
      
      // Add small delay before redirect to show success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push('/results');

    } catch (err) {
      console.error('Split error:', err);
      let errorMessage = 'Failed to split dataset: ';
      
      if (err.message.includes('Timeout')) {
        errorMessage += 'Operation timed out. Please try again with a smaller dataset or fewer partitions.';
      } else if (err.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds to complete the transaction.';
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
      setTransactionStatus('Split request failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Split dataset using sequence
  const splitDatasetBySequence = (sequence, dataset) => {
    if (!dataset) {
      throw new Error('No dataset available');
    }

    const originalDataset = dataset.datasets[0];
    const groupSize = Math.floor(sequence.length / numGroups);
    const splits = [];

    for (let i = 0; i < numGroups; i++) {
      const start = i * groupSize;
      const end = i === numGroups - 1 ? sequence.length : (i + 1) * groupSize;
      const groupIndices = sequence
        .slice(start, end)
        .map(num => parseInt(num) % originalDataset.data.length);

      splits.push({
        datasets: [{
          id: `${originalDataset.id}_split_${i + 1}`,
          name: `${originalDataset.name} - Split ${i + 1}`,
          description: originalDataset.description,
          features: [...originalDataset.features],
          target: originalDataset.target,
          rows: groupIndices.length,
          createdAt: new Date().toISOString(),
          data: groupIndices.map(index => originalDataset.data[index])
        }]
      });
    }

    return splits;
  };

  if (!mounted) return null;

  return (
    <div className="container">
      <Header />
      
      <div className="card">
        <h1 className="title">Welcome to eThAi</h1>
        <p className="subtitle">
          Transform your data into personalized AI models with guaranteed integrity
        </p>
  
        <div className="step-container fade-in">
          <div className="step-number">1</div>
          <h2 className="step-title">Upload your dataset</h2>
          <div className="file-upload">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              id="fileInput"
            />
            <div className="file-upload-label">
              {uploadedDataset 
                ? 'Dataset loaded successfully!' 
                : 'Drop your JSON file here or click to browse'
              }
            </div>
          </div>
        </div>
  
        <div className="step-container fade-in">
          <div className="step-number">2</div>
          <h2 className="step-title">Select number of partitions</h2>
          <div className="number-input-container">
            <div 
              className="number-control"
              onClick={() => setNumGroups(prev => Math.max(2, prev - 1))}
            >
              −
            </div>
            <div className="number-display">
              {numGroups}
            </div>
            <div 
              className="number-control"
              onClick={() => setNumGroups(prev => prev + 1)}
            >
              +
            </div>
          </div>
        </div>
  
        <button
          onClick={handleSplitRequest}
          disabled={isLoading || !uploadedDataset || !provider}
          className={`train-button ${
            isLoading || !uploadedDataset || !provider
              ? 'train-button-disabled'
              : 'train-button-enabled'
          }`}
        >
          {isLoading ? 'Processing...' : 'Split Dataset'}
        </button>
  
        {transactionStatus && (
          <div className="status-message success fade-in">
            {transactionStatus}
          </div>
        )}
  
        {error && (
          <div className="status-message error fade-in">
            {error}
          </div>
        )}
  
      </div>
    </div>
  );
}