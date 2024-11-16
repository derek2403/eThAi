// app/split/page.js
"use client";

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { GENERATOR_ADDRESS, ABI } from '@/utils/constants';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://nillion-storage-apis-v0.onrender.com';
const APP_ID = process.env.NEXT_PUBLIC_APP_ID || 'b478ac1e-1870-423f-81c3-a76bf72f394a';
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

  if (!mounted) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <Header />
      
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">eThAi Data Splitter</h1>
        <p className="text-gray-600 mb-8 text-center">
          Transform your data into personalized AI models with guaranteed integrity
        </p>

        <div className="space-y-8">
          {/* Step 1: Upload */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">1. Upload Dataset</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="fileInput"
              />
              <label
                htmlFor="fileInput"
                className="cursor-pointer text-blue-500 hover:text-blue-600"
              >
                Drop your JSON file here or click to browse
              </label>
              {uploadedDataset && (
                <p className="mt-2 text-green-500">Dataset loaded successfully</p>
              )}
            </div>
          </div>

          {/* Step 2: Partitions */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">2. Select Partitions</h2>
            <div className="flex items-center justify-center space-x-4">
              <button
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                onClick={() => setNumGroups(prev => Math.max(2, prev - 1))}
              >
                −
              </button>
              <span className="text-xl font-semibold">{numGroups}</span>
              <button
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                onClick={() => setNumGroups(prev => prev + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* Split Button */}
          <button
            onClick={handleSplitRequest}
            disabled={isLoading || !uploadedDataset || !provider}
            className={`w-full py-3 rounded-lg font-semibold transition-colors
              ${isLoading || !uploadedDataset || !provider
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
          >
            {isLoading ? 'Processing...' : 'Split Dataset'}
          </button>

          {/* Status Messages */}
          {transactionStatus && (
            <div className="p-4 bg-blue-50 text-blue-700 rounded-lg">
              {transactionStatus}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}