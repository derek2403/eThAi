"use client";

import React from 'react';
import { Header } from '../../components/Header';
import { useRouter } from 'next/navigation';
import styles from '../../styles/closeModelCard.css';

const ModelCard = ({ model, isRecommended, onSelect }) => {
  const router = useRouter();

  const handleSelectClick = () => {
    // First handle the model selection
    onSelect(model);
    // Then navigate to results page
    router.push('/results');
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
        description: "Private data classification training with reward incentives. Secure and confidential training environment.",
        requirements: [
          "Encrypted labeled datasets",
          "Secure data handling compliance",
          "NDA agreement",
          "Private preprocessing pipeline"
        ],
        returns: [
          "Direct token rewards",
          "Performance-based bonuses",
          "Private model ownership",
          "Exclusive usage rights"
        ],
        minDataset: "5K+",
        complexity: "Medium",
        computation: "Low",
        benefits: [
          "Immediate token compensation",
          "Revenue sharing opportunities",
          "Private deployment rights",
          "Exclusive client access"
        ],
        icon: "/classification-icon.svg"
      },
      {
        name: "Regression Model",
        description: "Confidential numerical prediction training with competitive rewards. Enterprise-grade security.",
        requirements: [
          "Private numerical datasets",
          "Secure feature handling",
          "Confidentiality agreement",
          "Enterprise compliance"
        ],
        returns: [
          "Premium token rewards",
          "Accuracy-based incentives",
          "Commercial usage rights",
          "Client network access"
        ],
        minDataset: "10K+",
        complexity: "Medium",
        computation: "Medium",
        benefits: [
          "Higher reward multipliers",
          "Enterprise client exposure",
          "Commercial licensing options",
          "Priority support access"
        ],
        icon: "/regression-icon.svg"
      },
      {
        name: "Transformer Model",
        description: "High-security NLP model training with premium incentives. Enterprise-level confidentiality.",
        requirements: [
          "Encrypted text datasets",
          "Enterprise security protocols",
          "Legal compliance verification",
          "Secure compute environment"
        ],
        returns: [
          "Premium token rewards",
          "Performance incentives",
          "Enterprise deployment rights",
          "Client network privileges"
        ],
        minDataset: "50K+",
        complexity: "High",
        computation: "High",
        benefits: [
          "Maximum reward potential",
          "Enterprise partnership opportunities",
          "Commercial deployment rights",
          "Priority project access"
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