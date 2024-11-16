import { useState, useEffect } from 'react';
import { 
  retrieveAndStoreModel, 
  getLocalModel, 
  getStoredModels 
} from '../utils/modelUtils';

export default function Models() {
  const [models, setModels] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load stored models on component mount
    const storedModels = getStoredModels();
    setModels(storedModels);
  }, []);

  const handleRetrieveModel = async (modelId) => {
    setLoading(true);
    setError(null);
    try {
      const modelData = await retrieveAndStoreModel(modelId);
      setModels(prevModels => ({
        ...prevModels,
        [modelId]: modelData
      }));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6">
          <h2 className="text-2xl font-bold mb-4">Stored Models</h2>

          {/* Model Retrieval Form */}
          <div className="mb-6">
            <form onSubmit={(e) => {
              e.preventDefault();
              const modelId = e.target.modelId.value;
              handleRetrieveModel(modelId);
            }}>
              <div className="flex gap-4">
                <input
                  type="text"
                  name="modelId"
                  placeholder="Enter Model ID"
                  className="flex-1 rounded-md border-gray-300 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Retrieving...' : 'Retrieve Model'}
                </button>
              </div>
            </form>
            {error && (
              <p className="mt-2 text-red-600 text-sm">{error}</p>
            )}
          </div>

          {/* Models List */}
          <div className="space-y-4">
            {Object.entries(models).map(([id, data]) => (
              <div key={id} className="border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Model ID</p>
                    <p className="font-mono text-sm">{id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dataset</p>
                    <p>{data.datasetName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Trainer</p>
                    <p className="font-mono text-sm">{data.trainer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Retrieved</p>
                    <p>{new Date(data.retrievedAt).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Metrics</p>
                  <pre className="mt-1 text-sm bg-gray-50 p-2 rounded">
                    {JSON.stringify(data.metrics, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 