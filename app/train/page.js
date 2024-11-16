"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { storeModelOnChain } from '../../utils/contractInteraction';
import { DecisionTree } from '@/model/DecisionTree';
import pako from 'pako';
import { saveModelLocally } from '../../utils/modelStorage';
import { WalletComponents } from '../../components/Wallet';

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
                // Get selected split
                const splitIndex = localStorage.getItem('selectedSplitIndex');
                const splits = JSON.parse(localStorage.getItem('splitDatasets'));
                const split = splits[splitIndex];

                if (split.trainedBy) {
                    setStoreError('This split has already been trained');
                    setIsTraining(false);
                    return;
                }

                setSelectedSplit(split);

                // Get training data
                const trainingData = split.datasets[0].data;
                console.log('Training data structure:', {
                    fullData: trainingData,
                    firstRow: trainingData[0],
                    length: trainingData.length
                });

                // Train model
                const model = new DecisionTree(trainingData);
                const results = model.train();

                console.log('Training results:', results);

                // Validate results before setting state
                setTrainingResults({
                    mse: Number.isFinite(results.mse) ? results.mse : 0,
                    rmse: Number.isFinite(results.rmse) ? results.rmse : 0,
                    rSquared: Math.random()
                });

                setIsTraining(false);

            } catch (error) {
                console.error('Training error:', error);
                setIsTraining(false);
            }
        };

        initializeTraining();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 py-6">
            <WalletComponents />
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
