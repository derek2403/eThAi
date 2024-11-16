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

                if (!results || typeof results.mse !== 'number') {
                    throw new Error('Invalid training results');
                }

                setTrainingResults(results);
                setIsTraining(false);

                // Debug log
                console.log('Model structure:', {
                    tree: model.tree,
                    labelEncoder: model.labelEncoder
                });

                const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
                const modelName = `WM_${timestamp}`;
                const datasetName = split.datasets[0].name || "Weather_2023";

                // Debug logs
                console.log('Raw model:', model);
                console.log('Model tree:', model.tree);
                console.log('Model labelEncoder:', model.labelEncoder);

                const modelData = {
                    tree: model.tree || {},
                    labelEncoder: model.labelEncoder || {}
                };
                console.log('Model data to be sent:', modelData);

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

                // Log the response for debugging
                console.log('API Response:', await saveModelResponse.clone().json());

                if (!saveModelResponse.ok) {
                    const errorData = await saveModelResponse.json();
                    throw new Error(errorData.message || 'Failed to save model');
                }

                const { path: modelPath } = await saveModelResponse.json();
                console.log('Model saved locally at:', modelPath);

                // Compress and store on blockchain
                const compressedModel = await compressModelData(model);
                const txHash = await storeModelOnChain(modelName, datasetName, {
                    mse: results.mse || 0.000001,
                    rmse: results.rmse || 0.001,
                    rSquared: results.rSquared || 0.5
                });

                console.log('Model stored on chain:', txHash);

                // Update localStorage
                splits[splitIndex] = {
                    ...split,
                    trainedBy: address,
                    metrics: {
                        mse: results.mse,
                        rmse: results.rmse,
                        rSquared: results.rSquared
                    },
                    modelName,
                    txHash
                };
                localStorage.setItem('splitDatasets', JSON.stringify(splits));

                router.push('/results');

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
