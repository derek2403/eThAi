"use client";

import React from 'react';
import { Header } from '../../components/Header';
import { useRouter } from 'next/navigation';
import styles from '../../styles/openModelCard.css';

const ModelCard = ({ model, isRecommended, onSelect }) => {
  const router = useRouter();

  const handleSelectClick = () => {
    // First handle the model selection
    onSelect(model);
    // Then navigate to results page
    router.push('/dataset');
  };

  return (
    <div className="model-card fade-in-up">
      {isRecommended && (
        <span className="recommended-badge">Most Used</span>
      )}
      <div className="card-background" style={{ backgroundImage: `url(${model.icon})` }} />
      
      <div className="card-header">
        <h3 className="model-type">{model.name}</h3>
        <p className="model-description">{model.description}</p>
      </div>

      <div className="requirements-section">
        <h4 className="section-label">Requirements</h4>
        <ul className="features-list">
          {model.requirements.map((req, index) => (
            <li key={index} className="feature-item">
              <span className="feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </span>
              {req}
            </li>
          ))}
        </ul>
      </div>

      <div className="returns-section">
        <h4 className="section-label">Returns</h4>
        <ul className="features-list">
          {model.returns.map((ret, index) => (
            <li key={index} className="feature-item">
              <span className="feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
              {ret}
            </li>
          ))}
        </ul>
      </div>

      <div className="model-stats">
        <div className="stat-item">
          <div className="stat-value">{model.minDataset}</div>
          <div className="stat-label">Min. Dataset</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{model.complexity}</div>
          <div className="stat-label">Complexity</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{model.computation}</div>
          <div className="stat-label">Computation</div>
        </div>
      </div>

      <button 
        className="select-button" 
        onClick={handleSelectClick}
      >
        Start Training
      </button>
    </div>
  );
};

export default function CloseModelCard() {
  const router = useRouter();

  const handleModelSelect = (model) => {
    // You can store the selected model in state management if needed
    // For example, using localStorage or Redux
    localStorage.setItem('selectedModel', JSON.stringify(model));
    
    // Navigation is now handled in the ModelCard component
    console.log(`Selected model: ${model.name}`);
  };

  // Rest of your models data remains the same
  const models = [
    {
        name: "Classification Model",
        description: "Public dataset training for categorical predictions. Contribute to community-driven classification solutions.",
        requirements: [
          "Publicly available labeled datasets",
          "Minimum 1000 samples per category",
          "Documented data distribution",
          "Open-source preprocessing pipeline"
        ],
        returns: [
          "Community recognition and contributions",
          "Model performance benchmarks",
          "Public research citations",
          "Open-source project portfolio"
        ],
        minDataset: "5K+",
        complexity: "Medium",
        computation: "Low",
        benefits: [
          "Knowledge sharing with community",
          "Public research impact",
          "GitHub contribution history",
          "Collaboration opportunities"
        ],
        icon: "/classification-icon.svg"
      },
      {
        name: "Regression Model",
        description: "Community-driven numerical prediction training. Contribute to public forecasting models.",
        requirements: [
          "Open-source numerical datasets",
          "Public feature documentation",
          "Standardized data formats",
          "Reproducible preprocessing steps"
        ],
        returns: [
          "Public model benchmarks",
          "Community feedback and improvements",
          "Research collaboration opportunities",
          "Project documentation credits"
        ],
        minDataset: "10K+",
        complexity: "Medium",
        computation: "Medium",
        benefits: [
          "Research paper collaborations",
          "Model optimization insights",
          "Community recognition",
          "Portfolio development"
        ],
        icon: "/regression-icon.svg"
      },
      {
        name: "Transformer Model",
        description: "Contribute to open-source language models. Advance public NLP research.",
        requirements: [
          "Public text corpora",
          "Open-source preprocessing tools",
          "Community guidelines compliance",
          "Documentation standards"
        ],
        returns: [
          "Research community recognition",
          "Model architecture contributions",
          "Public dataset improvements",
          "Academic collaboration opportunities"
        ],
        minDataset: "50K+",
        complexity: "High",
        computation: "High",
        benefits: [
          "Academic publication potential",
          "Research community impact",
          "Open-source contribution record",
          "Public speaking opportunities"
        ],
        icon: "/transformer-icon.svg"
      }
  ];

  return (
    <div>
      <Header />
      <div className="container">
        <h1 className="section-title">Select Training Model Type</h1>
        <p className="section-subtitle">
          Choose the appropriate model type based on your dataset characteristics and desired outcomes.
          Each model type has specific requirements and provides different types of results.
        </p>
        
        <div className="cards-grid">
          {models.map((model, index) => (
            <ModelCard
              key={index}
              model={model}
              isRecommended={index === 0}
              onSelect={handleModelSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}