"use client"

import React, { useState, useEffect } from 'react';
import { PushAPI, CONSTANTS } from '@pushprotocol/restapi';
import { ethers } from 'ethers';
import { DAO_CONTRACT, DAO_ABI } from '../../utils/DAOconstants';
import Image from 'next/image';
import styles from '../../styles/push.css';
import { Header } from '../../components/Header';

const PushChat = () => {
    const FIXED_GROUP_ID = '7511131ece0491b5e0e18e1a643b88c924a5a9192195b9aed627b4c9322bf81c';
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    // Add useEffect to handle stream setup
    useEffect(() => {
        let stream;

        const setupStream = async () => {
            if (!user) return;

            try {
                // Initialize stream
                stream = await user.initStream([CONSTANTS.STREAM.CHAT]);

                // Handle incoming messages
                stream.on(CONSTANTS.STREAM.CHAT, (message) => {
                    console.log('Received message:', message);
                    if (message.chatId === FIXED_GROUP_ID && message.event === 'chat.message') {
                        setMessages(prev => {
                            // Skip messages with invalid or empty content
                            if (!message.message?.content || message.message.content === '...') {
                                return prev;
                            }

                            // For self messages, only add if origin is 'self'
                            // For other messages, only add if origin is 'other'
                            const shouldAdd = 
                                (message.from === user.address && message.origin === 'self') || 
                                (message.from !== user.address && message.origin === 'other');

                            if (!shouldAdd) return prev;

                            // Check for duplicates
                            const messageExists = prev.some(m => 
                                m.timestamp === message.timestamp && 
                                m.from === message.from &&
                                m.message?.content === message.message?.content
                            );
                            
                            if (messageExists) return prev;

                            return [...prev, message];
                        });
                    }
                });

                stream.connect();
            } catch (error) {
                console.error('Stream setup error:', error);
            }
        };

        setupStream();

        // Cleanup function
        return () => {
            if (stream) {
                stream.disconnect();
            }
        };
    }, [user]);

    // Add the rules for token gating - only token check, no invites
    const chatRules = {
        entry: {
            conditions: {
                all: [  // Changed from 'any' to 'all' to enforce token requirement
                    {
                        // Check for TRAIN token balance
                        any: [
                            {
                                type: 'PUSH',
                                category: 'ERC20',
                                subcategory: 'holder',
                                data: {
                                    // Use Scroll Sepolia chain ID
                                    contract: `eip155:534351:${DAO_CONTRACT}`,
                                    comparison: '>=',
                                    amount: 100,
                                    decimals: 18,
                                },
                            },
                        ],
                    },
                ],
            },
        },
    };

    const checkTokenBalance = async (signer) => {
        try {
            // First create DAO contract instance
            const daoContract = new ethers.Contract(DAO_CONTRACT, DAO_ABI, signer);
            
            // Get token contract address from DAO
            const tokenAddr = await daoContract.token();
            
            // Create token contract instance with ERC20 interface
            const tokenContract = new ethers.Contract(tokenAddr, [
                "function balanceOf(address account) external view returns (uint256)",
                "function symbol() external view returns (string)"
            ], signer);

            const userAddress = await signer.getAddress();
            
            // Get token balance
            const balance = await tokenContract.balanceOf(userAddress);
            
            // Convert balance to number for comparison (assuming 18 decimals)
            const balanceInTokens = Number(ethers.formatEther(balance));
            
            console.log('User Token Balance:', balanceInTokens);
            console.log('Required Token Balance:', 100);
            
            return balanceInTokens >= 100;
        } catch (error) {
            console.error('Error checking token balance:', error);
            return false;
        }
    };

    const connectWallet = async () => {
        try {
            setLoading(true);
            setStatus('Connecting wallet...');

            if (typeof window.ethereum === 'undefined') {
                alert('Please install MetaMask!');
                return;
            }

            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Check token balance before proceeding
            const hasEnoughTokens = await checkTokenBalance(signer);
            console.log('Has enough tokens:', hasEnoughTokens);

            if (!hasEnoughTokens) {
                setStatus('Error: Insufficient TRAIN tokens. You need at least 100 TRAIN tokens to join.');
                return;
            }

            setStatus('Initializing Push Protocol...');

            const pushUser = await PushAPI.initialize(signer, {
                env: CONSTANTS.ENV.STAGING,
                rules: chatRules
            });

            setUser(pushUser);
            
            // Only try to join if user has enough tokens
            await joinGroup(pushUser);
            
            setStatus('Connected and joined group!');
        } catch (error) {
            setStatus('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const joinGroup = async (pushUser) => {
        try {
            setLoading(true);
            setStatus('Checking eligibility to join group...');

            // Additional token balance check before joining
            const signer = await pushUser.signer;
            const hasEnoughTokens = await checkTokenBalance(signer);
            
            if (!hasEnoughTokens) {
                throw new Error('Insufficient TRAIN tokens. You need at least 100 TRAIN tokens to join.');
            }

            setStatus('Joining group...');

            // Fetch group details and join
            const group = await pushUser.chat.group.join(FIXED_GROUP_ID);
            setStatus(`Joined group: ${FIXED_GROUP_ID}`);

            // Fetch initial messages
            const history = await pushUser.chat.history(FIXED_GROUP_ID);
            setMessages(history.reverse());
        } catch (error) {
            console.error('Error joining group:', error);
            setStatus('Error joining group: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const sendMessage = async () => {
        try {
            setLoading(true);
            setStatus('Sending message...');

            let messageContent = {
                type: 'Text',
                content: newMessage
            };

            // If there's an image, send it instead
            if (selectedImage) {
                messageContent = {
                    type: 'Image',
                    content: selectedImage
                };
            }

            const sentMessage = await user.chat.send(FIXED_GROUP_ID, messageContent);

            // Add the new message to the messages array immediately
            const newMessageObj = {
                from: user.address,
                message: messageContent,
                timestamp: Date.now(),
                origin: 'self',
                ...sentMessage
            };
            setMessages(prev => [...prev, newMessageObj]);
            
            setNewMessage('');
            setSelectedImage(null); // Reset selected image
            setStatus('Message sent!');
        } catch (error) {
            setStatus('Error sending message: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Add custom theme
    const blueTheme = {
        borderRadius: {
            ChatView: '12px',
            chatProfile: '8px',
            messageInput: '8px',
            searchInput: '8px',
            modal: '8px',
        },
        backgroundColor: {
            ChatViewBackground: '#f0f8ff', // Light blue background
            chatProfileBackground: '#ffffff',
            messageInputBackground: '#ffffff',
            chatSentBubbleBackground: '#1976d2', // Blue for sent messages
            chatReceivedBubbleBackground: '#ffffff', // White for received messages
            buttonBackground: '#1976d2', // Blue for buttons
        },
        textColor: {
            chatProfileText: '#1976d2', // Blue text
            messageInputText: '#2c3e50',
            chatSentBubbleText: '#ffffff', // White text for sent messages
            chatReceivedBubbleText: '#2c3e50', // Dark text for received messages
            timestamp: '#666666',
        },
        border: {
            ChatView: '1px solid #e3f2fd',
            chatProfile: '1px solid #e3f2fd',
            messageInput: '1px solid #e3f2fd',
        },
        iconColor: {
            emoji: '#1976d2',
            attachment: '#1976d2',
            sendButton: '#1976d2',
        },
    };

    return (
        <div>
            <Header />
            <div className="chat-container">
                <div className="chat-header">
                    <Image src="/push-protocol.png" alt="Push Protocol" width={40} height={40} />
                    <h1>Push Protocol Chat</h1>
                </div>

                {/* Messages container with conditional styling */}
                <div className={`messages-container ${!user ? 'inactive' : ''}`}>
                    {user ? (
                        messages.map((msg, index) => {
                            if (!msg.message?.content || msg.message.content === '...') {
                                return null;
                            }
        
                            const isOwnMessage = msg.origin === 'self';
                            const messageTime = msg.timestamp 
                                ? new Date(Number(msg.timestamp)).toLocaleTimeString() 
                                : '';
                            const messageContent = msg.message?.content || '';
                            const walletAddress = msg.from?.split(':').pop() || '';
                            const displayAddress = isOwnMessage 
                                ? walletAddress 
                                : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
                            const isImage = msg.message?.type === 'Image';
        
                            return (
                                <div
                                    key={index}
                                    className={`message ${isOwnMessage ? 'message-self' : 'message-other'}`}
                                >
                                    <div className="message-address">{displayAddress}</div>
                                    <div className="message-content">
                                        {isImage ? (
                                            <img
                                                src={messageContent.startsWith('data:') 
                                                    ? messageContent 
                                                    : `data:image/png;base64,${messageContent}`}
                                                alt="Sent image"
                                                className="message-image"
                                                onError={(e) => {
                                                    console.error('Image failed to load:', messageContent);
                                                    e.target.src = '/fallback-image.png';
                                                }}
                                            />
                                        ) : (
                                            messageContent
                                        )}
                                    </div>
                                    <div className="message-time">{messageTime}</div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="placeholder-text">
                            Connect wallet to start chatting
                        </div>
                    )}
                </div>

                {/* Moved connection status below messages */}
                <div className={`input-section ${!user ? 'pre-connect' : ''}`}>
                    {user ? (
                        <div className="input-container">
                            <div className="message-input-wrapper">
                                {selectedImage ? (
                                    <div className="selected-image-container">
                                        <img 
                                            src={selectedImage} 
                                            alt="Selected"
                                            className="selected-image"
                                        />
                                        <button
                                            onClick={() => setSelectedImage(null)}
                                            className="remove-image-button"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="Type your message"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                                        disabled={loading || selectedImage}
                                        className="message-input"
                                    />
                                )}
                            </div>
                            
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                disabled={loading || newMessage.length > 0}
                                style={{ display: 'none' }}
                                id="image-input"
                            />
                            <label 
                                htmlFor="image-input"
                                className="image-button"
                            >
                                📷
                            </label>
                            
                            <button
                                onClick={sendMessage}
                                disabled={loading || (!newMessage && !selectedImage)}
                                className="send-button"
                            >
                                Send
                            </button>
                        </div>
                    ) : (
                        <div className="connection-status">
                            <span className="status-text">Status: {status}</span>
                            <button
                                onClick={connectWallet}
                                disabled={loading}
                                className="connect-button"
                            >
                                Connect Wallet
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PushChat;