// app/page.js
'use client';
import { useState, useEffect } from 'react';

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
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Nillion Storage Demo</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <p className="mb-2"><strong>User Seed:</strong> {USER_SEED}</p>
          <p><strong>User ID:</strong> {userId || 'Loading...'}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Dataset Controls</h2>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="fileUpload" className="text-sm font-medium text-gray-700">
                Upload JSON Dataset
              </label>
              <input
                id="fileUpload"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="border rounded p-2"
              />
            </div>
            <p><strong>Dataset Status:</strong> {dataset ? `${dataset.length} items loaded` : 'No file uploaded'}</p>
            {uploadedFile && (
              <p className="text-sm text-gray-600">
                <strong>File:</strong> {uploadedFile.name}
              </p>
            )}
            <button
              onClick={storeDatasetInNillion}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
              disabled={loading || !dataset}
            >
              Upload Dataset to Nillion
            </button>
            {uploadStatus && (
              <p className="text-sm text-gray-600">{uploadStatus}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Store IDs</h2>
          {storeIds.length > 0 ? (
            <ul className="space-y-2">
              {storeIds.map((store, index) => (
                <li key={index} className="border p-4 rounded">
                  <p><strong>Store ID:</strong> {store.store_id}</p>
                  <p><strong>Secret Name:</strong> {store.secret_name}</p>
                  <button
                    onClick={async () => {
                      const secret = await retrieveSecret(store.store_id, store.secret_name);
                      if (secret) {
                        setSecrets(prev => [...prev, { id: store.store_id, name: store.secret_name, data: secret }]);
                      }
                    }}
                    className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                    disabled={loading}
                  >
                    Retrieve Secret
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No store IDs found</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Retrieved Secrets</h2>
          {secrets.length > 0 ? (
            <ul className="space-y-2">
              {secrets.map((secret, index) => (
                <li key={index} className="border p-4 rounded">
                  <p><strong>Store ID:</strong> {secret.id}</p>
                  <p><strong>Secret Name:</strong> {secret.name}</p>
                  <pre className="mt-2 bg-gray-50 p-4 rounded overflow-x-auto">
                    {JSON.stringify(secret.data, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          ) : (
            <p>No secrets retrieved yet</p>
          )}
        </div>
      </div>
    </div>
  );
}