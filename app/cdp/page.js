// app/cdp/page.js
'use client';
import { useState, useEffect } from 'react';
import { useWalletClient } from 'wagmi';
import { useRouter } from 'next/navigation';

export default function CDPPage() {
  const router = useRouter();
  const [platformBalance, setPlatformBalance] = useState('0');
  const [platformAddress, setPlatformAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [score, setScore] = useState(75);
  const [transactions, setTransactions] = useState([]);

  const fetchWalletInfo = async () => {
    try {
      setStatus('Fetching wallet info...');
      setError('');
      const response = await fetch('/api/reward', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setPlatformBalance(data.balance);
      setPlatformAddress(data.address);
      setStatus('Platform wallet ready');
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch wallet info: ' + err.message);
      setStatus('Error occurred');
    }
  };

  const rewardUser = async (userAddress, contributionScore) => {
    if (!userAddress) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setStatus('Processing reward payment...');
    setError('');

    try {
      const response = await fetch('/api/reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: userAddress,
          contributionScore,
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Get training details if available
        const trainingData = localStorage.getItem('trainingCompletion');
        const { modelName, txHash, timestamp } = trainingData ? JSON.parse(trainingData) : {};
        
        // Add to transaction history
        setTransactions(prev => [{
          hash: data.transactionHash,
          link: data.transactionLink,
          address: userAddress,
          score: contributionScore,
          timestamp: new Date().toLocaleString(),
          modelName,
          trainingTxHash: txHash,
          trainingTimestamp: timestamp
        }, ...prev]);

        // Update platform balance
        setPlatformBalance(data.balance);
        setStatus('Reward sent successfully');
        setError('');
        
        // Clear training completion data
        localStorage.removeItem('trainingCompletion');

        // Add a small delay to show success message before redirecting
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Redirect to results page
        router.push('/results');
      } else {
        throw new Error(data.error || 'Failed to send reward');
      }
    } catch (err) {
      console.error('Reward error:', err);
      setError('Failed to send reward: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletInfo();
    // Refresh wallet info every 30 seconds
    const interval = setInterval(fetchWalletInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  // Add new useEffect to check for pending rewards
  useEffect(() => {
    const checkPendingRewards = () => {
      try {
        const trainingData = localStorage.getItem('trainingCompletion');
        if (trainingData) {
          const { trainerAddress, pendingReward } = JSON.parse(trainingData);
          
          if (pendingReward) {
            // Auto-fill the form
            setUserAddress(trainerAddress);
            setScore(60); // Fixed score for model training
            
            // Clear the pending reward flag
            const updatedData = JSON.parse(trainingData);
            updatedData.pendingReward = false;
            localStorage.setItem('trainingCompletion', JSON.stringify(updatedData));
            
            // Optional: Automatically trigger the reward
            rewardUser(trainerAddress, 60);
          }
        }
      } catch (error) {
        console.error('Error checking pending rewards:', error);
      }
    };

    checkPendingRewards();
  }, []); // Run once on component mount

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px', fontSize: '2em', color: '#333' }}>AI Training Reward System</h1>
      
      {/* Platform Wallet Status */}
      <div style={{ 
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Platform Wallet Status</h3>
        <div style={{ marginBottom: '8px' }}>
          <strong>Balance:</strong> {platformBalance} ETH
        </div>
        <div style={{ marginBottom: '8px', wordBreak: 'break-all' }}>
          <strong>Address:</strong> {platformAddress || 'Loading...'}
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>Status:</strong> {loading ? 'Processing...' : status}
        </div>
        {error && (
          <div style={{ 
            color: '#dc3545', 
            marginTop: '10px',
            padding: '10px',
            borderRadius: '4px',
            backgroundColor: '#f8d7da'
          }}>
            {error}
          </div>
        )}
        <button 
          onClick={fetchWalletInfo}
          disabled={loading}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: loading ? '#6c757d' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          Refresh Wallet Info
        </button>
      </div>

      {/* Send Reward Form */}
      <div style={{ 
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Send Reward</h3>
        
        {/* Wallet Address Input */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px',
            color: '#495057',
            fontWeight: '500'
          }}>
            User Wallet Address:
          </label>
          <input
            type="text"
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Score Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px',
            color: '#495057',
            fontWeight: '500'
          }}>
            Contribution Score (0-100):
          </label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            min="0"
            max="100"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
          <div style={{ 
            marginTop: '5px', 
            fontSize: '0.875em', 
            color: '#6c757d' 
          }}>
            Score determines reward amount (100 = max reward)
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={() => rewardUser(userAddress, score)}
          disabled={loading || !userAddress}
          style={{
            padding: '12px 20px',
            backgroundColor: loading || !userAddress ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !userAddress ? 'not-allowed' : 'pointer',
            width: '100%',
            fontSize: '16px',
            transition: 'background-color 0.3s'
          }}
        >
          {loading ? 'Processing...' : 'Send Reward'}
        </button>
      </div>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div style={{ 
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Transaction History</h3>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}>
            {transactions.map((tx, index) => (
              <div key={index} style={{
                padding: '12px',
                borderBottom: index < transactions.length - 1 ? '1px solid #dee2e6' : 'none',
                fontSize: '0.875em'
              }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>TX:</strong>{' '}
                  <a 
                    href={tx.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#007bff', textDecoration: 'none' }}
                  >
                    {tx.hash}
                  </a>
                </div>
                <div style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                  <strong>To:</strong> {tx.address}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Score:</strong> {tx.score}
                </div>
                <div style={{ color: '#6c757d' }}>{tx.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}