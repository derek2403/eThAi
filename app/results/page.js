"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, Button, Progress, Chip } from "@nextui-org/react";
import styles from '../../styles/results.css';
import {Header} from '@/components/Header';

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
        router.push('/AIChat');

    } catch (error) {
        console.error('Error aggregating models:', error);
        alert('Failed to aggregate models: ' + error.message);
    } finally {
        setIsAggregating(false);
    }
};

  return (
    <div className="main-container">
      <Header />
      <div className="header-section">
        <h1>Training Progress</h1>
        <p>Monitor your model training status and performance metrics</p>
        {splits.length > 0 && (
          <div className="progress-overview">
            <div className="stat-box">
              <span className="stat-value">{splits.length}</span>
              <span className="stat-label">Total Splits</span>
            </div>
            <div className="stat-box">
              <span className="stat-value positive">
                {splits.filter(s => s.trainedBy).length}
              </span>
              <span className="stat-label">Trained Models</span>
            </div>
            <div className="stat-box">
              <span className="stat-value pending">
                {splits.length - splits.filter(s => s.trainedBy).length}
              </span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
        )}
      </div>

      {splits.length === 0 ? (
        <Card className="empty-state">
          <CardBody>
            <div className="empty-content">
              <div className="icon-container">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#0056FF" strokeWidth="1.5">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/>
                  <path d="M12 8V16"/>
                  <path d="M8 12H16"/>
                </svg>
              </div>
              <h3>No Datasets Available</h3>
              <p>Start by creating your first dataset split</p>
              <Link href="/split">
                <Button 
                  color="primary"
                  className="create-button"
                >
                  Create New Split
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="splits-list">
            {splits.map((split, index) => (
              <Card 
                key={index} 
                className={`split-row ${split.trainedBy ? 'trained' : ''}`}
              >
                <CardBody>
                  <div className="split-content">
                    <div className="split-info">
                      <div className="split-header">
                        <h3>Split {index + 1}</h3>
                        <Chip 
                          className={split.trainedBy ? 'status-trained' : 'status-pending'}
                          size="sm"
                        >
                          {split.trainedBy ? 'Trained' : 'Pending'}
                        </Chip>
                      </div>
                      {split.trainedBy && (
                        <div className="trainer-info">
                          <span><strong>Model:</strong> {split.modelName}</span>
                          <span><strong>Trainer:</strong> {split.trainedBy}</span>
                        </div>
                      )}
                    </div>

                    {split.trainedBy ? (
                      <div className="metrics-section">
                        {split.metrics && (
                          <div className="metrics-container">
                            <div className="metric-item">
                              <label>MSE</label>
                              <div className="metric-value">{split.metrics.mse.toFixed(6)}</div>
                              <Progress 
                                value={split.metrics.mse * 100}
                                className="metric-bar"
                                color="success"
                              />
                            </div>
                            <div className="metric-item">
                              <label>RMSE</label>
                              <div className="metric-value">{split.metrics.rmse.toFixed(6)}</div>
                              <Progress 
                                value={split.metrics.rmse * 100}
                                className="metric-bar"
                                color="success"
                              />
                            </div>
                            <div className="metric-item">
                              <label>R²</label>
                              <div className="metric-value">{split.metrics.rSquared.toFixed(6)}</div>
                              <Progress 
                                value={split.metrics.rSquared * 100}
                                className="metric-bar"
                                color="success"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="action-section">
                        <Button
                          color="primary"
                          onClick={() => handleSplitSelect(index)}
                          size="lg"
                          className="train-button"
                        >
                          Train Model
                        </Button>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="aggregate-section">
            <Button
              color="success"
              size="lg"
              isLoading={isAggregating}
              isDisabled={isAggregating || splits.filter(s => s.trainedBy).length < 2}
              onClick={handleAggregateModels}
              className="aggregate-button"
            >
              {isAggregating ? 'Aggregating...' : 'Aggregate Models'}
            </Button>
            {splits.filter(s => s.trainedBy).length < 2 && (
              <p className="aggregate-hint">Train at least 2 models to enable aggregation</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}