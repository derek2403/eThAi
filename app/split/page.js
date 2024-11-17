// app/split/page.js
"use client";

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { GENERATOR_ADDRESS, ABI } from '@/utils/constants';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { CheckoutComponent } from '@/components/Checkout';
import styles from '../../styles/split.css';

export default function Split() {
  const router = useRouter();
  const [uploadedDataset, setUploadedDataset] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fee, setFee] = useState(null);
  const [numGroups, setNumGroups] = useState(5);
  const [splitDatasets, setSplitDatasets] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState('');
  const [provider, setProvider] = useState(null);

  // Initialize provider and fee
  useEffect(() => {
    const initProvider = async () => {
      try {
        if (window.ethereum) {
          const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_OP_SEPOLIA_RPC);
          setProvider(provider);
          
          const contract = new ethers.Contract(GENERATOR_ADDRESS, ABI, provider);
          const requiredFee = await contract.getFee();
          setFee(requiredFee);
        }
      } catch (err) {
        console.error('Provider initialization error:', err);
        setError('Failed to connect to the network. Please check your connection.');
      }
    };

    initProvider();
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

      const jsonData = JSON.parse(fileContent);
      if (!jsonData.datasets || !Array.isArray(jsonData.datasets) || !jsonData.datasets[0]?.data) {
        throw new Error('Invalid dataset format. Please ensure your JSON has the correct structure.');
      }

      setUploadedDataset(jsonData);
      setTransactionStatus('Dataset loaded successfully');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Error processing file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate random sequence and split dataset
  const handleSplitRequest = async () => {
    if (!provider || !uploadedDataset || !fee) {
      setError('Please ensure all requirements are met before splitting');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSplitDatasets(null);

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

      // Request sequence from contract
      setTransactionStatus('Requesting sequence...');
      const dataLength = uploadedDataset.datasets[0].data.length;
      const tx = await contract.requestSequence(dataLength, userRandomNumber, { value: fee });
      
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

      // Watch for sequence generation
      const parsedEvent = contract.interface.parseLog(sequenceRequestEvent);
      const sequenceNumber = parsedEvent.args.sequenceNumber;

      setTransactionStatus('Waiting for sequence generation...');
      
      // Set up event listener with timeout
      const sequence = await Promise.race([
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            contract.removeAllListeners('SequenceGenerated');
            reject(new Error('Timeout waiting for sequence'));
          }, 60000);

          contract.on('SequenceGenerated', (resultSequence, numbers) => {
            if (resultSequence.toString() === sequenceNumber.toString()) {
              clearTimeout(timeout);
              contract.removeAllListeners('SequenceGenerated');
              resolve(Array.from(numbers).map(n => n.toString()));
            }
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out')), 70000)
        )
      ]);

      // Split dataset using sequence
      const splits = splitDatasetBySequence(sequence);
      setSplitDatasets(splits);
      
      // Store splits in localStorage and redirect
      localStorage.setItem('splitDatasets', JSON.stringify(splits));
      router.push('/results');

    } catch (err) {
      console.error('Split error:', err);
      setError(err.message || 'Failed to split dataset');
      setTransactionStatus('Split request failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Split dataset using sequence
  const splitDatasetBySequence = (sequence) => {
    if (!uploadedDataset) {
      throw new Error('No dataset available');
    }

    const originalDataset = uploadedDataset.datasets[0];
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