// components/WalletConnection.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserProvider } from 'ethers';

const WalletContext = createContext(undefined);

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState('');
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      setLoading(true);
      
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAddress(address);

      localStorage.setItem('walletConnected', 'true');
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAddress('');
    setSigner(null);
    setProvider(null);
    localStorage.removeItem('walletConnected');
  };

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setProvider(provider);
      setSigner(signer);
      setAddress(address);
    }
  };

  useEffect(() => {
    const initWallet = async () => {
      try {
        if (window.ethereum && localStorage.getItem('walletConnected') === 'true') {
          await connectWallet();
        }
      } catch (error) {
        console.error('Error initializing wallet:', error);
        localStorage.removeItem('walletConnected');
      } finally {
        setLoading(false);
      }
    };

    initWallet();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <WalletContext.Provider 
      value={{ 
        address, 
        signer, 
        provider, 
        connectWallet, 
        disconnectWallet,
        loading,
        formatAddress
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletButton = () => {
  const { address, connectWallet, disconnectWallet, loading, formatAddress } = useWallet();

  const handleClick = async () => {
    if (address) {
      disconnectWallet();
    } else {
      try {
        await connectWallet();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <button 
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg transition-colors ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        address ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
      }`}
      disabled={loading}
    >
      {loading ? 'Loading...' : address ? formatAddress(address) : 'Connect Wallet'}
    </button>
  );
};