"use client";
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { GENERATOR_ADDRESS, ABI } from '../../utils/constants';
import { useRouter } from 'next/navigation';

export default function Split() {
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

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_OP_SEPOLIA_RPC);
      setProvider(provider);
    }
  }, []);

  useEffect(() => {
    async function getFee() {
      if (!provider) return;
      
      try {
        const contract = new ethers.Contract(GENERATOR_ADDRESS, ABI, provider);
        const requestFee = await contract.getFee();
        setFee(requestFee);
      } catch (err) {
        console.error('Fee fetch error:', err);
        setError('Failed to get fee');
      }
    }
    
    if (provider) {
      getFee();
    }
  }, [provider]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedDataset = JSON.parse(e.target.result);
          setDataset(parsedDataset);
          setSize(parsedDataset.datasets[0].data.length);
          setTransactionStatus('Dataset loaded successfully');
        } catch (err) {
          setError('Error parsing JSON file');
          console.error('Parse error:', err);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const watchForResults = useCallback(async (sequence, txHash) => {
    if (!provider || !dataset) return;

    try {
      const contract = new ethers.Contract(GENERATOR_ADDRESS, ABI, provider);

      setTransactionStatus('Waiting for transaction confirmation...');

      // Wait for transaction confirmation first
      const receipt = await provider.waitForTransaction(txHash);
      console.log('Transaction confirmed:', receipt);

      setTransactionStatus('Transaction confirmed. Checking for sequence...');

      // Check past events first
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100); // Look back 100 blocks
      
      const filter = contract.filters.SequenceGenerated();
      const events = await contract.queryFilter(filter, fromBlock, 'latest');
      
      const matchingEvent = events.find(event => {
        return event.args && event.args.sequenceNumber.toString() === sequence.toString();
      });

      if (matchingEvent) {
        console.log('Sequence found in past events:', matchingEvent.args.sequence);
        const splits = splitDatasetBySequence(matchingEvent.args.sequence.map(n => n.toString()));
        setSplitDatasets(splits);
        return;
      }

      setTransactionStatus('Waiting for sequence generation...');

      // Set up event listener with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout waiting for sequence')), 60000); // 60 second timeout
      });

      const eventPromise = new Promise((resolve) => {
        contract.on('SequenceGenerated', (resultSequence, numbers) => {
          console.log('Event received:', resultSequence.toString(), sequence.toString());
          if (resultSequence.toString() === sequence.toString()) {
            resolve(numbers);
          }
        });
      });

      try {
        const numbers = await Promise.race([eventPromise, timeoutPromise]);
        console.log('Sequence generated:', numbers);
        const splits = splitDatasetBySequence(numbers.map(n => n.toString()));
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

  const requestSequence = async () => {
    if (!provider || !dataset) return;

    try {
      setIsLoading(true);
      setError(null);
      setSplitDatasets(null);

      const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(GENERATOR_ADDRESS, ABI, wallet);

      setTransactionStatus('Generating random number...');
      const userRandomNumber = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('Random number generated:', userRandomNumber);

      setTransactionStatus('Requesting sequence...');
      const tx = await contract.requestSequence(size, userRandomNumber, { value: fee });
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      
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
      console.log('Sequence requested:', sequenceNumber.toString());

      await watchForResults(sequenceNumber, tx.hash);

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to process request');
      setTransactionStatus('Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const splitDatasetBySequence = (sequence) => {
    if (!dataset) {
      throw new Error('Please upload a dataset first');
    }

    const originalDataset = dataset.datasets[0];
    const groupSize = Math.floor(sequence.length / numGroups);
    const splits = [];

    for (let i = 0; i < numGroups; i++) {
      const start = i * groupSize;
      const end = i === numGroups - 1 ? sequence.length : (i + 1) * groupSize;
      const groupIndices = sequence.slice(start, end).map(num => parseInt(num) % originalDataset.data.length);

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

    localStorage.setItem('splitDatasets', JSON.stringify(splits));
    router.push('/results');
    
    return splits;
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Dataset Splitter</h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Upload Dataset (JSON)
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="mt-1 block w-full"
              />
            </div>

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
          </div>
        </div>
      </div>
    </div>
  );
} 