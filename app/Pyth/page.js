"use client";
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { SPLITTER_ADDRESS, ABI } from '../../utils/constantsPyth';
import { useRouter } from 'next/navigation';

export default function DatasetShuffler() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fee, setFee] = useState(null);
    const [numSplits, setNumSplits] = useState(2);
    const [transactionStatus, setTransactionStatus] = useState('');
    const [sequence, setSequence] = useState(null);
    const [splitData, setSplitData] = useState(null);
    const [dataRows, setDataRows] = useState(null);
    const router = useRouter();

    useEffect(() => {
        async function getDataRows() {
            try {
                const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_OP_SEPOLIA_RPC);
                const contract = new ethers.Contract(SPLITTER_ADDRESS, ABI, provider);
                const rows = await contract.getDataRows();
                setDataRows(rows);
            } catch (err) {
                console.error('Error fetching data rows:', err);
            }
        }
        getDataRows();
    }, []);

    const mapSequenceToData = (sequence) => {
        if (!dataRows) return null;
        return sequence.map(index => {
            const idx = Number(index);
            return dataRows[idx];
        });
    };

    const checkPastEvents = useCallback(async (sequenceNumber) => {
        try {
            console.log('Checking past events for sequence:', sequenceNumber);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(SPLITTER_ADDRESS, ABI, provider);
            
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 100);
            
            const filter = contract.filters.SequenceGenerated();
            const events = await contract.queryFilter(filter, fromBlock, 'latest');
            
            const matchingEvent = events.find(event => {
                const args = event.args;
                return args.sequenceNumber.toString() === sequenceNumber.toString();
            });
            
            if (matchingEvent) {
                const sequence = matchingEvent.args.sequence;
                console.log('Raw sequence indices:', sequence.map(n => n.toString()));
                
                const mappedData = mapSequenceToData(sequence);
                console.log('Mapped sequence data:', mappedData);
                
                setSequence(mappedData);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error checking past events:', err);
            return false;
        }
    }, [dataRows]);

    useEffect(() => {
        async function getFee() {
            try {
                console.log('Fetching Pyth Network fee');
                const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_OP_SEPOLIA_RPC);
                const contract = new ethers.Contract(SPLITTER_ADDRESS, ABI, provider);
                const requestFee = await contract.getFee();
                console.log('Fee retrieved:', requestFee.toString());
                setFee(requestFee);
            } catch (err) {
                console.error('Fee fetch error:', err);
                setError('Failed to get Pyth Network fee');
            }
        }
        getFee();
    }, []);
    
    const listenForEvents = useCallback(async (contract, sequenceNumber) => {
        console.log('Setting up event listeners for sequence:', sequenceNumber);

        contract.on("SequenceGenerated", (returnedSequence, generatedSequence) => {
            console.log('SequenceGenerated event received:', {
                returnedSequence: returnedSequence.toString(),
                rawSequence: generatedSequence.map(n => n.toString())
            });
            
            if (returnedSequence.toString() === sequenceNumber.toString()) {
                const mappedData = mapSequenceToData(generatedSequence);
                console.log('Mapped sequence data:', mappedData);
                setSequence(mappedData);
                setTransactionStatus('Random sequence generated, creating splits...');
            }
        });

        contract.on("ShuffledDataReturned", (returnedSequence, numSplits, splits) => {
            console.log('ShuffledDataReturned event received:', {
                returnedSequence: returnedSequence.toString(),
                numSplits: numSplits.toString(),
                splits: splits
            });
            
            if (returnedSequence.toString() === sequenceNumber.toString()) {
                setSplitData(splits);
                setTransactionStatus('Shuffle and splits completed successfully');
                setIsLoading(false);
                contract.removeAllListeners();
            }
        });
    }, [dataRows]);

    const requestShuffle = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setSequence(null);
            setSplitData(null);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SPLITTER_ADDRESS, ABI, signer);

            const userRandomNumber = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
                .map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('Random number generated:', userRandomNumber);

            setTransactionStatus('Requesting shuffle from contract...');
            
            const tx = await contract.requestShuffle(
                numSplits,
                userRandomNumber,
                { value: fee }
            );
            console.log('Transaction sent:', tx.hash);

            setTransactionStatus('Transaction submitted. Waiting for confirmation...');
            
            const receipt = await tx.wait();
            console.log('Transaction receipt:', receipt);
            
            // Detailed logging of receipt
            console.log('Transaction confirmed:', {
                hash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                status: receipt.status,
                logs: receipt.logs
            });

            const requestEvent = receipt.logs.find(log => {
                try {
                    const parsed = contract.interface.parseLog(log);
                    return parsed.name === 'SequenceRequested';
                } catch (e) {
                    return false;
                }
            });

            const parsedLog = contract.interface.parseLog(requestEvent);
            const sequenceNumber = parsedLog.args.sequenceNumber;
            console.log('Sequence requested:', sequenceNumber.toString());
            
            // Check for past events first
            const foundInPast = await checkPastEvents(sequenceNumber);
            if (!foundInPast) {
                setTransactionStatus('Shuffle requested. Waiting for Pyth Network random number...');
                await listenForEvents(contract, sequenceNumber);
            }

        } catch (err) {
            console.error('Error in requestShuffle:', err);
            setError(err.message || 'Failed to process shuffle request');
            setIsLoading(false);
        }
    };

    // Add this helper function to safely convert BigInt to string
    const formatValue = (value, idx) => {
        // Convert BigInt to string and handle special formatting for distance
        const stringValue = value.toString();
        if (idx === 2) { // Distance column
            return (Number(stringValue) / 10).toFixed(1);
        }
        return stringValue;
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold mb-6">Dataset Shuffler (Pyth Network)</h1>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Number of Splits
                        </label>
                        <input
                            type="number"
                            value={numSplits}
                            onChange={(e) => setNumSplits(Math.max(2, Math.min(5, parseInt(e.target.value))))}
                            min="2"
                            max="5"
                            className="w-full border border-gray-300 rounded-md p-2"
                        />
                    </div>

                    {fee && (
                        <div className="text-sm text-gray-600">
                            Required Pyth Network fee: {ethers.formatEther(fee)} ETH
                        </div>
                    )}

                    <button
                        onClick={requestShuffle}
                        disabled={isLoading || !fee}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 
                                disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Processing...' : 'Shuffle Dataset'}
                    </button>

                    {/* Status and error displays remain the same */}

                    {sequence && (
                        <div className="p-4 bg-gray-50 rounded-md">
                            <h3 className="font-medium mb-2">Generated Sequence</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full border">
                                    <thead>
                                        <tr>
                                            <th className="border px-4 py-2">Rooms</th>
                                            <th className="border px-4 py-2">Age</th>
                                            <th className="border px-4 py-2">Distance</th>
                                            <th className="border px-4 py-2">Tax</th>
                                            <th className="border px-4 py-2">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sequence.map((row, index) => (
                                            <tr key={index}>
                                                {Array.from(row).map((value, idx) => (
                                                    <td key={idx} className="border px-4 py-2">
                                                        {formatValue(value, idx)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {splitData && (
                        <div className="mt-6">
                            <h2 className="text-xl font-semibold mb-4">Split Results</h2>
                            {splitData.map((split, splitIndex) => (
                                <div key={splitIndex} className="mb-6">
                                    <h3 className="font-medium mb-2">Split {splitIndex + 1}</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full border">
                                            <thead>
                                                <tr>
                                                    <th className="border px-4 py-2">Rooms</th>
                                                    <th className="border px-4 py-2">Age</th>
                                                    <th className="border px-4 py-2">Distance</th>
                                                    <th className="border px-4 py-2">Tax</th>
                                                    <th className="border px-4 py-2">Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {split.map((row, rowIndex) => (
                                                    <tr key={rowIndex}>
                                                        {Array.from(row).map((value, idx) => (
                                                            <td key={idx} className="border px-4 py-2">
                                                                {formatValue(value, idx)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                            
                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={() => router.push('/results')}
                                    className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 
                                            transition-colors duration-200 flex items-center gap-2"
                                >
                                    View Results
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className="h-5 w-5" 
                                        viewBox="0 0 20 20" 
                                        fill="currentColor"
                                    >
                                        <path 
                                            fillRule="evenodd" 
                                            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" 
                                            clipRule="evenodd" 
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}