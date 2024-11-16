"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Results() {
    const [splits, setSplits] = useState([]);
    const [selectedSplit, setSelectedSplit] = useState(null);
    const [isAggregating, setIsAggregating] = useState(false);
    const router = useRouter();

    useEffect(() => {
        try {
            const savedSplits = localStorage.getItem('splitDatasets');
            if (savedSplits) {
                setSplits(JSON.parse(savedSplits));
            }
        } catch (error) {
            console.error('Error loading splits:', error);
        }
    }, []);

    const handleSplitSelect = (index) => {
        // Only allow selection if split is not already trained
        if (!splits[index].trainedBy) {
            setSelectedSplit(index);
            localStorage.setItem('selectedSplitIndex', index);
            router.push('/train');
        }
    };

    const handleAggregateModels = async () => {
        try {
            setIsAggregating(true);
            
            const response = await fetch('/api/aggregateModels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to aggregate models');
            }

            const result = await response.json();
            console.log('Aggregation result:', result);
            
            // Store the localStorageModel from the response
            localStorage.setItem('aggregatedModel', JSON.stringify(result.localStorageModel));
            alert(`Successfully aggregated ${result.treeCount} models!`);
            router.push('/aichat');

        } catch (error) {
            console.error('Error aggregating models:', error);
            alert('Failed to aggregate models: ' + error.message);
        } finally {
            setIsAggregating(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Available Splits</h1>
            
            <div className="grid gap-4">
                {splits.map((split, index) => (
                    <div 
                        key={index}
                        className={`p-4 border rounded-lg cursor-pointer ${
                            split.trainedBy 
                                ? 'bg-green-50 border-green-200' 
                                : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSplitSelect(index)}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Split {index + 1}
                                </h3>
                                {split.trainedBy && (
                                    <div className="mt-2 text-sm">
                                        <p>Trained by: {split.trainedBy}</p>
                                        <p>Model: {split.modelName}</p>
                                        {split.metrics && (
                                            <div className="mt-1">
                                                <p>MSE: {split.metrics.mse.toFixed(6)}</p>
                                                <p>RMSE: {split.metrics.rmse.toFixed(6)}</p>
                                                <p>R-Squared: {split.metrics.rSquared.toFixed(6)}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center">
                                {split.trainedBy ? (
                                    <svg 
                                        className="w-6 h-6 text-green-500" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2} 
                                            d="M5 13l4 4L19 7" 
                                        />
                                    </svg>
                                ) : (
                                    <button 
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                        onClick={() => handleSplitSelect(index)}
                                    >
                                        Train
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {splits.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-600">No splits available.</p>
                    <Link href="/split" className="text-blue-500 hover:underline mt-2 inline-block">
                        Create New Split
                    </Link>
                </div>
            ) : (
                <div className="text-center mt-8">
                    <button
                        onClick={handleAggregateModels}
                        disabled={isAggregating || splits.filter(s => s.trainedBy).length < 2}
                        className={`px-6 py-3 rounded-lg font-semibold
                            ${isAggregating || splits.filter(s => s.trainedBy).length < 2
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-purple-500 hover:bg-purple-600 text-white'
                            }`}
                    >
                        {isAggregating ? 'Aggregating...' : 'Aggregate Models'}
                    </button>
                    {splits.filter(s => s.trainedBy).length < 2 && (
                        <p className="text-sm text-gray-500 mt-2">
                            Train at least 2 models to enable aggregation
                        </p>
                    )}
                </div>
            )}
        </div>
    );
} 