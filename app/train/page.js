"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { storeModelOnChain } from '../../utils/contractInteraction';
import { DecisionTree } from '@/model/DecisionTree';
import pako from 'pako';
import { saveModelLocally } from '../../utils/modelStorage';
import { WalletComponents } from '../../components/Wallet';


const compressModelData = async (model) => {
    try {
        const modelString = typeof model === 'string' ? model : JSON.stringify(model);
        const modelData = new TextEncoder().encode(modelString);
        const compressedData = pako.deflate(modelData);
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

                if (!split || !split.datasets || !split.datasets[0]?.data) {
                    throw new Error('Invalid split data');
                }

                setSelectedSplit(split);

                // Train model
                const model = new DecisionTree(split.datasets[0].data);
                const results = model.train();

                // Debug logs to check model training
                console.log('Training data:', split.datasets[0].data);
                console.log('Trained model:', model);
                console.log('Training results:', results);

                if (!model.tree || !model.labelEncoder) {
                    throw new Error('Model training failed - missing tree or labelEncoder');
                }

                setTrainingResults(results);
                setIsTraining(false);

                // Get wallet address
                let userAddress;
                if (window.ethereum) {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    userAddress = await signer.getAddress();
                } else {
                    throw new Error('Ethereum wallet not found');
                }

                const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
                const modelName = `${userAddress}_${timestamp}`;
                const datasetName = split.datasets[0].name || "Weather_2023";

                // Prepare model data and verify it's not empty
                const modelData = {
                    tree: model.getTree(), // Add a method to get the tree if needed
                    labelEncoder: model.getLabelEncoder() // Add a method to get the encoder if needed
                };

                console.log('Model data to be saved:', modelData);

                if (!modelData.tree || Object.keys(modelData.tree).length === 0) {
                    throw new Error('Model tree is empty');
                }

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
                const txHash = await storeModelOnChain(
                    userAddress,
                    modelName, 
                    datasetName, 
                    {
                        mse: results.mse || 0.000001,
                        rmse: results.rmse || 0.001,
                        rSquared: results.rSquared || 0.5
                    }
                );

                setStoreError(null);
                setStoreTxHash(txHash);

            } catch (error) {
                console.error('Error:', error);
                setStoreError(error.message);
                return;
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
