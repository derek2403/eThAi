import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import contractConfig from '../utils/modelabi.json';
import { useAccount } from 'wagmi';

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [aiSigner, setAiSigner] = useState(null);
  const [forestModel, setForestModel] = useState(null);
  const { address } = useAccount();

  // Initialize model, contract, and wallet
  useEffect(() => {
    const init = async () => {
      // Load model from localStorage
      const aggregatedModel = localStorage.getItem('aggregatedModel');
      if (aggregatedModel) {
        const model = JSON.parse(aggregatedModel);
        setForestModel(model);
      }

      // Initialize contract and AI signer
      const initContract = async () => {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const aiWallet = new ethers.Wallet(process.env.NEXT_PUBLIC_AI_PRIVATE_KEY, provider);
        setAiSigner(aiWallet);

        const contractInstance = new ethers.Contract(
          contractConfig.contractAddress,
          contractConfig.abi,
          provider
        );
        setContract(contractInstance);

        // Listen for new responses
        contractInstance.on("ResponseReceived", (conversationId, response) => {
          setMessages(prev => prev.map(msg => 
            msg.conversationId === conversationId 
              ? { ...msg, response, isPending: false }
              : msg
          ));
        });
      };

      initContract();
    };

    init();

    return () => {
      if (contract) {
        contract.removeAllListeners();
      }
    };
  }, []);

  // Process prediction using the model
  const processModelPrediction = async (query) => {
    if (!forestModel) throw new Error('Model not loaded');

    try {
      const response = await fetch('/api/predict-forest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          naturalLanguageInput: query,
          // Also pass the forestModel if needed
          model: forestModel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Prediction failed');
      }

      const result = await response.json();
      
      // Format the response for the chat
      return `Based on the weather parameters (Temperature: ${result.parameters.temperature}°C, Humidity: ${result.parameters.humidity}%, Month: ${result.parameters.month}), 
      I predict the weather will be: ${result.prediction} 
      (Confidence: ${result.confidence}%)`;
    } catch (error) {
      console.error('Prediction error details:', error);
      throw new Error(`Prediction failed: ${error.message}`);
    }
  };

  // Submit query to blockchain
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !contract || !address || !forestModel) return;

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // User submits query
      const tx = await contract.connect(signer).submitQuery(newMessage);
      const receipt = await tx.wait();

      // Find the QuerySubmitted event
      const queryEvent = receipt.logs.find(log => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          return parsedLog.name === 'QuerySubmitted';
        } catch (_) { // Changed 'e' to '_' to indicate unused parameter
          return false;
        }
      });

      if (!queryEvent) {
        throw new Error('Query event not found in transaction');
      }

      const parsedEvent = contract.interface.parseLog(queryEvent);
      const conversationId = parsedEvent.args.conversationId;

      // Add message to UI
      setMessages(prev => [...prev, {
        id: Date.now(),
        conversationId,
        query: newMessage,
        sender: address,
        isPending: true
      }]);

      // Process with actual model and submit response
      const prediction = await processModelPrediction(newMessage);
      console.log('Prediction result:', prediction); // Debug log

      const responseTx = await contract.connect(aiSigner).submitResponse(conversationId, prediction);
      await responseTx.wait();

      setNewMessage('');
    } catch (error) {
      console.error('Detailed error:', error);
      alert(error.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="text-center py-6 border-b">
          <h1 className="text-4xl font-bold text-blue-600">AI Weather Assistant</h1>
          {address && (
            <p className="text-sm text-gray-500 mt-2">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
        </div>
  
        {/* Chat Area */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === address ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === address
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100'
                }`}
              >
                <p>{message.query}</p>
                {message.response && <p className="mt-2">{message.response}</p>}
                {message.isPending && (
                  <p className="text-sm italic mt-1">Processing prediction...</p>
                )}
              </div>
            </div>
          ))}
        </div>
  
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask about the weather..."
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:border-blue-500"
              disabled={isLoading || !address || !forestModel}
            />
            <button
              type="submit"
              disabled={isLoading || !address || !forestModel || !newMessage.trim()}
              className={`px-8 py-3 rounded-full font-semibold transition-colors ${
                isLoading || !address || !forestModel || !newMessage.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}