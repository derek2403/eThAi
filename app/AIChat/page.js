'use client'

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import contractConfig from '@/utils/modelabi.json';
import styles from '../../styles/aichat.css';
import { Header } from '../../components/Header';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function RandomForestWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <RandomForest />
    </QueryClientProvider>
  )
}

function RandomForest() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [aiSigner, setAiSigner] = useState(null);
  const [forestModel, setForestModel] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [address, setAddress] = useState(null);

  useEffect(() => {
    setIsClient(true);
    connectWallet();
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAddress(accounts[0]);

        window.ethereum.on('accountsChanged', function (accounts) {
          setAddress(accounts[0]);
        });
      } catch (error) {
        console.error('Error connecting to wallet:', error);
      }
    }
  };

  useEffect(() => {
    if (!isClient) return;

    const getStoredModel = () => {
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('aggregatedModel');
          return stored ? JSON.parse(stored) : {};
        }
        return {};
      } catch {
        return {};
      }
    };

    const aggregatedModel = getStoredModel();
    setForestModel(aggregatedModel);

    const initContract = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const aiWallet = new ethers.Wallet(process.env.NEXT_PUBLIC_AI_PRIVATE_KEY, provider);
        setAiSigner(aiWallet);

        const contractInstance = new ethers.Contract(
          contractConfig.contractAddress,
          contractConfig.abi,
          provider
        );
        setContract(contractInstance);

        contractInstance.on("ResponseReceived", (conversationId, response) => {
          setMessages(prev => prev.map(msg => 
            msg.conversationId === conversationId 
              ? { ...msg, response, isPending: false }
              : msg
          ));
        });
      } catch (error) {
        console.error('Contract initialization error:', error);
      }
    };

    initContract();

    return () => {
      if (contract) {
        contract.removeAllListeners();
      }

    };
  }, [isClient]);

  const processModelPrediction = async (query) => {
    if (!forestModel) throw new Error('Model not loaded');

    const response = await fetch('/api/predictForest', {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !contract || !address || !forestModel) return;

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tx = await contract.connect(signer).submitQuery(newMessage);
      const receipt = await tx.wait();

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

      setMessages(prev => [...prev, {
        id: Date.now(),
        conversationId,
        query: newMessage,
        sender: address,
        isPending: true
      }]);

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

  if (!isClient) {
    return null;
  }

  return (
    <div className="chat-wrapper">
      <Header />
      <div className="chat-container">
        <div className="chat-header">
          <h1 className="chat-title">
            <a 
              href="https://sepolia.scrollscan.com/address/0x4bdfc8a1d09d55e4e2d50f52052e6c4b6932ccfb"
              target="_blank"
              rel="noopener noreferrer"
              className="contract-link"
            >
              weathergpt.eth
            </a>
          </h1>
          {address && (
            <div className="wallet-info">
              <span className="connection-indicator"></span>
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          )}
        </div>

        <div className="messages-container">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-wrapper ${
                message.sender === address ? 'sent' : 'received'
              }`}
            >
              <div
                className={`message-bubble ${
                  message.sender === address ? 'sent' : 'received'
                }`}
              >
                {message.query && (
                  <div className="message-text user-message">{message.query}</div>
                )}
                
                {message.response && (
                  <div className="message-response ai-message">{message.response}</div>
                )}
                
                {message.isPending && (
                  <div className="pending-message">Processing prediction...</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="input-container">
          <div className="input-wrapper">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask about the weather..."
              className="chat-input"
              disabled={isLoading || !address || !forestModel}
            />
            <button
              type="submit"
              disabled={isLoading || !address || !forestModel || !newMessage.trim()}
              className={`send-button ${
                isLoading || !address || !forestModel || !newMessage.trim()
                  ? 'send-button-disabled'
                  : 'send-button-enabled'
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