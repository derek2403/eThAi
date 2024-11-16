import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import contractConfig from '../utils/modelabi.json';

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [aiSigner, setAiSigner] = useState(null);
  const [forestModel, setForestModel] = useState(null);
  const [address, setAddress] = useState('');

  // Initialize model, contract, and wallet
  useEffect(() => {
    const init = async () => {
      // Load model from localStorage
      const aggregatedModel = localStorage.getItem('aggregatedModel');
      if (aggregatedModel) {
        const model = JSON.parse(aggregatedModel);
        setForestModel(model);
      }

      // Get wallet address
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        setAddress(userAddress);
      }

      // Initialize contract and AI signer
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

    const response = await fetch('/api/predict-forest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        naturalLanguageInput: query
      })
    });

    if (!response.ok) {
      throw new Error('Prediction failed');
    }

    const result = await response.json();
    return result.prediction;
  };

  // Submit query to blockchain
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !contract || !address || !forestModel) return;

    setIsLoading(true);
    try {
      // Get provider and signer
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
        } catch (e) {
          return false;
        }
      });

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
      const responseTx = await contract.connect(aiSigner).submitResponse(conversationId, prediction);
      await responseTx.wait();

      setNewMessage('');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Chat Header */}
        <div className="border-b p-4">
          <h1 className="text-xl font-bold">AI Weather Assistant</h1>
          {address && (
            <p className="text-sm text-gray-500">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
        </div>

        {/* Chat Messages */}
        <div className="h-[500px] overflow-y-auto p-4 space-y-4">
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
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask about the weather..."
              className="flex-1 rounded-lg border p-2"
              disabled={isLoading || !address || !forestModel}
            />
            <button
              type="submit"
              disabled={isLoading || !address || !forestModel || !newMessage.trim()}
              className={`px-4 py-2 rounded-lg font-semibold ${
                isLoading || !address || !forestModel || !newMessage.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
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