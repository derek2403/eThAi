"use client";
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { GENERATOR_ADDRESS, ABI } from '../../utils/constants';
import { useRouter } from 'next/navigation';
import styles from '../../styles/split.css';
import { Header } from '../../components/Header';

const API_BASE = 'https://nillion-storage-apis-v0.onrender.com';
const APP_ID = 'b478ac1e-1870-423f-81c3-a76bf72f394a';
const USER_SEED = 'user_123';

export default function Split() {
  const [userId, setUserId] = useState('');
  const [storeIds, setStoreIds] = useState([]);
  const [nillionStatus, setNillionStatus] = useState('');
  const [currentStoreId, setCurrentStoreId] = useState(null);
  const [currentSecretName, setCurrentSecretName] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fee, setFee] = useState(null);
  const [numGroups, setNumGroups] = useState(5);
  const [splitDatasets, setSplitDatasets] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [size, setSize] = useState(50);
  const [transactionStatus, setTransactionStatus] = useState('');
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [provider, setProvider] = useState(null);
  const [retrievedData, setRetrievedData] = useState(null);

  // Initialize
  useEffect(() => {
    setMounted(true);
    checkUserId();
    if (typeof window !== 'undefined') {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_OP_SEPOLIA_RPC);
      setProvider(provider);
      fetchRequiredFee(provider);
    }
  }, []);

  // Nillion user check
  const checkUserId = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nillion_seed: USER_SEED }),
      });
      const data = await response.json();
      setUserId(data.nillion_user_id);
    } catch (err) {
      setError('Error checking Nillion user ID: ' + err.message);
    }
  };

  // Store secret in Nillion
  const storeSecret = async (secretValue, secretName) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/apps/${APP_ID}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: {
            nillion_seed: USER_SEED,
            secret_value: secretValue,
            secret_name: secretName,
          },
          permissions: {
            retrieve: [],
            update: [],
            delete: [],
            compute: {},
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to store secret');
      return data;
    } catch (err) {
      setError('Error storing secret: ' + err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Retrieve and parse secret from Nillion
  const retrieveSecret = async (storeId, secretName) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE}/api/secret/retrieve/${storeId}?retrieve_as_nillion_user_seed=${USER_SEED}&secret_name=${secretName}`
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to retrieve secret');
      }

      // Parse the escaped JSON string properly
      const parsedSecret = JSON.parse(data.secret.replace(/\\/g, ''));
      return parsedSecret;
    } catch (err) {
      setError('Error retrieving secret: ' + err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // File upload handler
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      setNillionStatus('Reading file...');

      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const jsonData = JSON.parse(fileContent);
      const secretName = `dataset_split_${Date.now()}`;
      
      setNillionStatus('Storing in Nillion...');
      const storeResult = await storeSecret(
        JSON.stringify(jsonData),
        secretName
      );
      
      setCurrentStoreId(storeResult.store_id);
      setCurrentSecretName(secretName);
      setNillionStatus('Dataset stored successfully. Ready for splitting.');
      setTransactionStatus('Dataset stored in Nillion');
      
      setSize(jsonData.datasets[0].data.length);
      setDataset(jsonData);
      
    } catch (err) {
      setError('Error processing file: ' + err.message);
      console.error('Upload error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Watch for results
  const watchForResults = useCallback(async (sequence, txHash) => {
    if (!provider || !dataset) return;

    try {
      const contract = new ethers.Contract(GENERATOR_ADDRESS, ABI, provider);
      setTransactionStatus('Waiting for transaction confirmation...');
      
      const receipt = await provider.waitForTransaction(txHash);
      setTransactionStatus('Transaction confirmed. Checking for sequence...');

      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100);
      
      const filter = contract.filters.SequenceGenerated();
      const events = await contract.queryFilter(filter, fromBlock, 'latest');
      
      const matchingEvent = events.find(event => 
        event.args && event.args.sequenceNumber.toString() === sequence.toString()
      );

      if (matchingEvent) {
        const sequenceArray = Array.from(matchingEvent.args.sequence).map(n => n.toString());
        const splits = splitDatasetBySequence(sequenceArray);
        setSplitDatasets(splits);
        return;
      }

      setTransactionStatus('Waiting for sequence generation...');

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout waiting for sequence')), 60000);
      });

      const eventPromise = new Promise((resolve) => {
        contract.on('SequenceGenerated', (resultSequence, numbers) => {
          if (resultSequence.toString() === sequence.toString()) {
            resolve(numbers);
          }
        });
      });

      try {
        const numbers = await Promise.race([eventPromise, timeoutPromise]);
        const sequenceArray = Array.from(numbers).map(n => n.toString());
        const splits = splitDatasetBySequence(sequenceArray);
        setSplitDatasets(splits);
      } catch (error) {
        throw new Error('Failed to receive sequence: ' + error.message);
      } finally {
        contract.removeAllListeners('SequenceGenerated');
      }

    } catch (err) {
      console.error('Error watching for results:', err);
      setError('Error: ' + err.message);
      setTransactionStatus('Failed to generate sequence');
    }
  }, [dataset, provider]);

  // Request sequence
  const requestSequence = async () => {
    if (!provider || !currentStoreId || !currentSecretName || !fee) return;

    try {
      setIsLoading(true);
      setError(null);
      setSplitDatasets(null);

      setNillionStatus('Retrieving dataset from Nillion...');
      const retrievedDataset = await retrieveSecret(currentStoreId, currentSecretName);
      
      if (!retrievedDataset.datasets || !retrievedDataset.datasets[0]?.data) {
        throw new Error('Invalid dataset structure');
      }

      const datasetArray = retrievedDataset.datasets[0].data;
      setSize(datasetArray.length);
      setDataset(retrievedDataset);

      const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(GENERATOR_ADDRESS, ABI, wallet);

      setTransactionStatus('Generating random number...');
      const userRandomNumber = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      setTransactionStatus('Requesting sequence...');
      const tx = await contract.requestSequence(
        datasetArray.length, 
        userRandomNumber, 
        { value: fee }
      );
      
      const receipt = await tx.wait();
      const sequenceRequestEvent = receipt.logs
        .find(log => {
          try {
            const parsedLog = contract.interface.parseLog(log);
            return parsedLog.name === 'SequenceRequested';
          } catch {
            return false;
          }
        });

      if (!sequenceRequestEvent) {
        throw new Error('Sequence request event not found in transaction receipt');
      }

      const parsedEvent = contract.interface.parseLog(sequenceRequestEvent);
      const sequenceNumber = parsedEvent.args.sequenceNumber;

      await watchForResults(sequenceNumber, tx.hash);

    } catch (err) {
      setError('Error: ' + err.message);
      setTransactionStatus('Split request failed');
      console.error('Split error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Split dataset by sequence
  const splitDatasetBySequence = (sequence) => {
    if (!dataset) {
      throw new Error('No dataset available');
    }

    const originalDataset = dataset.datasets[0];
    const groupSize = Math.floor(sequence.length / numGroups);
    const splits = [];

    console.log('Original Dataset:', originalDataset);
    console.log('Sequence:', sequence);
    console.log('Group Size:', groupSize);

    for (let i = 0; i < numGroups; i++) {
      const start = i * groupSize;
      const end = i === numGroups - 1 ? sequence.length : (i + 1) * groupSize;
      const groupIndices = sequence.slice(start, end).map(num => parseInt(num) % originalDataset.data.length);

      console.log(`Split ${i + 1}:`, {
        start,
        end,
        indices: groupIndices
      });

      const splitData = {
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
      };

      splits.push(splitData);
    }

    console.log('Final Splits:', splits);
    localStorage.setItem('splitDatasets', JSON.stringify(splits));
    setSplitDatasets(splits);
    
    // Add navigation to results page
    router.push('/results');
    
    return splits;
  };

<<<<<<< HEAD
  if (!mounted) {
    return null;
  }
  
=======
  // Add this new function to fetch the required fee
  const fetchRequiredFee = async (provider) => {
    try {
      const contract = new ethers.Contract(GENERATOR_ADDRESS, ABI, provider);
      const requiredFee = await contract.getFee();
      setFee(requiredFee);
    } catch (err) {
      console.error('Error fetching fee:', err);
      setError('Failed to fetch required fee');
    }
  };
>>>>>>> 40511e5b29e2db0a9f31cc7bfb4b2df318a52748

  // UI remains the same...
  return (
<<<<<<< HEAD
    <div className="container">
      <Header/>
      <div className="card">
        <h1 className="title fade-in">Welcome to eThAi</h1>
        <p className="subtitle fade-in">
          Transform your data into personalized AI models with guaranteed integrity and security
        </p>
        
        <div className="step-container fade-in">
          <div className="step-number">1</div>
          <h2 className="step-title">Upload your dataset</h2>
          <div className="file-upload">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
            />
            <div className="file-upload-label">
              Drop your JSON file here or click to browse
            </div>
          </div>
        </div>
  
        <div className="step-container fade-in">
          <div className="step-number">2</div>
          <h2 className="step-title">Select number of dataset partitions</h2>
          <div className="number-input-container">
            <div 
              className="number-control"
              onClick={() => setNumGroups(prev => Math.max(2, prev - 1))}
            >
              −
            </div>
            <div className="number-display">{numGroups}</div>
            <div 
              className="number-control"
              onClick={() => setNumGroups(prev => prev + 1)}
            >
              +
            </div>
          </div>
        </div>
  
        <button
          onClick={requestSequence}
          disabled={isLoading || !dataset || !provider}
          className={`train-button ${
            isLoading || !dataset || !provider
              ? 'train-button-disabled'
              : 'train-button-enabled'
          }`}
        >
          {isLoading ? 'Processing...' : 'Train Model'}
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
=======
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Secure Dataset Splitter</h1>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Nillion Storage Status</h2>
            <p className="text-sm text-gray-600">User ID: {userId || 'Connecting...'}</p>
            {currentStoreId && (
              <p className="text-sm text-gray-600">Current Store ID: {currentStoreId}</p>
            )}
            {nillionStatus && (
              <p className="text-sm text-blue-600 mt-2">{nillionStatus}</p>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Upload Dataset (JSON)
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="mt-1 block w-full"
              />
              {isLoading && (
                <p className="text-sm text-gray-500 mt-2">Processing...</p>
              )}
            </div>

            {dataset && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Number of Splits
                  </label>
                  <input
                    type="number"
                    value={numGroups}
                    onChange={(e) => setNumGroups(Math.max(2, parseInt(e.target.value)))}
                    min="2"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>

                <button
                  onClick={requestSequence}
                  disabled={isLoading || !dataset || !provider}
                  className={`w-full py-2 px-4 rounded-md ${
                    isLoading || !dataset || !provider
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isLoading ? 'Processing...' : 'Split Dataset'}
                </button>

                {transactionStatus && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">{transactionStatus}</p>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-4 bg-red-50 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {splitDatasets && (
          <div className="mt-8 bg-white rounded-lg shadow px-5 py-6 sm:px-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Split Results</h2>
            <div className="space-y-4">
              {splitDatasets.map((split, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">
                    {split.datasets[0].name}
                  </h3>
                  <div className="text-sm text-gray-600">
                    <p>Rows: {split.datasets[0].rows}</p>
                    <p>Created: {new Date(split.datasets[0].createdAt).toLocaleString()}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-600">
                        View Data Sample
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto max-h-40">
                        {JSON.stringify(split.datasets[0].data.slice(0, 5), null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

>>>>>>> 40511e5b29e2db0a9f31cc7bfb4b2df318a52748
      </div>
    </div>
  );
}