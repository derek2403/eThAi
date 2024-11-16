// app/page.js
'use client';
import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import styles from '../../styles/dataset.css';

const API_BASE = 'https://nillion-storage-apis-v0.onrender.com';
const APP_ID = 'b478ac1e-1870-423f-81c3-a76bf72f394a';
const USER_SEED = 'user_123';

export default function Home() {
  const [userId, setUserId] = useState('');
  const [storeIds, setStoreIds] = useState([]);
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => {
    checkUserId();
    listStoreIds();
  }, []);

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
      setError('Error checking user ID');
      console.error(err);
    }
  };

  const listStoreIds = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/apps/${APP_ID}/store_ids`);
      const data = await response.json();
      setStoreIds(data.store_ids || []);
    } catch (err) {
      setError('Error listing store IDs');
      console.error(err);
    }
  };

  const storeSecret = async (secretValue, secretName) => {
    try {
      setLoading(true);
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
      await listStoreIds();
      return data;
    } catch (err) {
      setError('Error storing secret');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const retrieveSecret = async (storeId, secretName) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/secret/retrieve/${storeId}?retrieve_as_nillion_user_seed=${USER_SEED}&secret_name=${secretName}`
      );
      const data = await response.json();
      // Parse the secret_value if it's a JSON string
      if (data.secret_value) {
        try {
          data.secret_value = JSON.parse(data.secret_value);
        } catch (e) {
          // If parsing fails, keep the original value
          console.log('Not a JSON string, keeping original value');
        }
      }
      return data;
    } catch (err) {
      setError('Error retrieving secret');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const storeDatasetInNillion = async () => {
    if (!dataset) {
      setError('No dataset loaded');
      return;
    }

    setLoading(true);
    setUploadStatus('Starting upload...');

    try {
      // Get the complete dataset object from the parent
      const response = await fetch('/dataset.json');
      const completeDataset = await response.json();
      
      // Store the complete JSON structure
      await storeSecret(JSON.stringify(completeDataset), 'complete_dataset');
      setUploadStatus('Dataset upload complete!');
      await listStoreIds();
    } catch (error) {
      setError('Error storing dataset: ' + error.message);
      setUploadStatus('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          setDataset(jsonData.datasets[0].data);
          setUploadedFile(file);
          setError(null);
        } catch (err) {
          setError('Invalid JSON file format');
          console.error(err);
        }
      };
      reader.onerror = () => {
        setError('Error reading file');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="nillion-container">
      <Header />
      <div className="page-header">
        <h1>Nillion Storage Dashboard</h1>
        <div className="header-underline"></div>
      </div>
  
      {error && (
        <div className="error-banner">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
        </div>
      )}
  
      <div className="dashboard-layout">
        <div className="main-column">
          <div className="info-card">
            <div className="card-header">
              <div className="header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2>User Information</h2>
            </div>
            <div className="info-content">
              <div className="info-row">
                <span className="info-label">User Seed:</span>
                <span className="info-value monospace">{USER_SEED}</span>
              </div>
              <div className="info-row">
                <span className="info-label">User ID:</span>
                <span className="info-value monospace">{userId || 'Loading...'}</span>
              </div>
            </div>
          </div>
  
          <div className="upload-card">
            <div className="card-header">
              <div className="header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h2>Dataset Controls</h2>
            </div>
            <div className="upload-content">
              <div className="file-upload-container">
                <label htmlFor="fileUpload">Upload JSON Dataset</label>
                <input
                  id="fileUpload"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="file-input"
                />
                {uploadedFile && (
                  <div className="file-info">
                    <span className="file-name">{uploadedFile.name}</span>
                    <span className="file-status">
                      {dataset ? `${dataset.length} items loaded` : 'Processing...'}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={storeDatasetInNillion}
                className={`upload-button ${(!dataset || loading) ? 'disabled' : ''}`}
                disabled={loading || !dataset}
              >
                {loading ? 'Processing...' : 'Upload to Nillion'}
              </button>
              {uploadStatus && (
                <div className="status-message">{uploadStatus}</div>
              )}
            </div>
          </div>
        </div>
  
        <div className="side-column">
          <div className="stores-card">
            <div className="card-header sticky-header">
              <div className="header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.29 7 12 12 20.71 7" />
                  <line x1="12" y1="22" x2="12" y2="12" />
                </svg>
              </div>
              <h2>Store IDs</h2>
            </div>
            <div className="stores-scroll">
              {storeIds.length > 0 ? (
                <div className="stores-list">
                  {storeIds.map((store, index) => (
                    <div key={index} className="store-item">
                      <div className="store-info">
                        <div className="store-row">
                          <span className="store-label">Store ID:</span>
                          <span className="store-value monospace">{store.store_id}</span>
                        </div>
                        <div className="store-row">
                          <span className="store-label">Secret Name:</span>
                          <span className="store-value">{store.secret_name}</span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const secret = await retrieveSecret(store.store_id, store.secret_name);
                          if (secret) {
                            setSecrets(prev => [...prev, { 
                              id: store.store_id, 
                              name: store.secret_name, 
                              data: secret 
                            }]);
                          }
                        }}
                        className="retrieve-button"
                        disabled={loading}
                      >
                        Retrieve Secret
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No store IDs found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}