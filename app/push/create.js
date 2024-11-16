"use client"

import React, { useState, useEffect } from 'react';
import { PushAPI, CONSTANTS } from '@pushprotocol/restapi';
import { ethers } from 'ethers';

const PushChat = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [groupId, setGroupId] = useState('');
    const [user, setUser] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [memberAddress, setMemberAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [joinGroupId, setJoinGroupId] = useState('');

    // Add useEffect to handle stream setup when groupId changes
    useEffect(() => {
        let stream;

        const setupStream = async () => {
            if (!user || !groupId) return;

            try {
                // Initialize stream
                stream = await user.initStream([CONSTANTS.STREAM.CHAT]);

                // Handle incoming messages
                stream.on(CONSTANTS.STREAM.CHAT, (message) => {
                    console.log('Received message:', message);
                    if (message.chatId === groupId && message.event === 'chat.message') {
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
    }, [user, groupId]);

    // Modify connectWallet to remove stream setup (it's now in useEffect)
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

            setStatus('Initializing Push Protocol...');

            const pushUser = await PushAPI.initialize(signer, {
                env: CONSTANTS.ENV.STAGING
            });

            setUser(pushUser);
            setStatus('Connected!');
        } catch (error) {
            setStatus('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Create a new chat group
    const createGroup = async () => {
        try {
            setLoading(true);
            setStatus('Creating group...');

            const newGroup = await user.chat.group.create(groupName, {
                description: 'A new chat group',
                image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // 1x1 pixel
                members: [], // Start with no members
                private: false
            });

            setGroupId(newGroup.chatId);
            setStatus(`Group created! ID: ${newGroup.chatId}`);

            // Fetch initial messages
            const history = await user.chat.history(newGroup.chatId);
            setMessages(history.reverse());
        } catch (error) {
            setStatus('Error creating group: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Add member to group
    const addMember = async () => {
        try {
            setLoading(true);
            setStatus('Adding member...');

            await user.chat.group.add(groupId, {
                role: 'MEMBER',  // Either 'ADMIN' or 'MEMBER'
                accounts: [memberAddress]  // Array of addresses to add
            });

            setStatus(`Member ${memberAddress} added!`);
            setMemberAddress('');
        } catch (error) {
            setStatus('Error adding member: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 4: Send message in group
    const sendMessage = async () => {
        try {
            setLoading(true);
            setStatus('Sending message...');

            const sentMessage = await user.chat.send(groupId, {
                type: 'Text',
                content: newMessage
            });

            // Add the new message to the messages array immediately
            const newMessageObj = {
                from: user.address,
                message: {
                    content: newMessage
                },
                timestamp: Date.now(),
                origin: 'self',
                ...sentMessage
            };
            setMessages(prev => [...prev, newMessageObj]);
            
            setNewMessage('');
            setStatus('Message sent!');
        } catch (error) {
            setStatus('Error sending message: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Add new function to join existing group
    const joinGroup = async () => {
        try {
            setLoading(true);
            setStatus('Joining group...');

            // Fetch group details and join
            const group = await user.chat.group.join(joinGroupId);
            setGroupId(group.chatId);
            setStatus(`Joined group: ${group.chatId}`);

            // Fetch initial messages
            const history = await user.chat.history(group.chatId);
            setMessages(history.reverse());
        } catch (error) {
            setStatus('Error joining group: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Add new GroupInfo component
    const GroupInfo = () => (
        <div style={{
            margin: '10px 0',
            padding: '15px',
            background: '#e3f2fd',
            borderRadius: '5px',
            border: '1px solid #2196F3'
        }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Current Group Information</h3>
            <p style={{ margin: '5px 0' }}>
                <strong>Group ID:</strong> 
                <span style={{ 
                    backgroundColor: '#fff',
                    padding: '5px 10px',
                    borderRadius: '3px',
                    marginLeft: '10px',
                    fontFamily: 'monospace'
                }}>
                    {groupId}
                </span>
                <button
                    onClick={() => navigator.clipboard.writeText(groupId)}
                    style={{
                        marginLeft: '10px',
                        padding: '5px 10px',
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                    }}
                >
                    Copy ID
                </button>
            </p>
            <p style={{ 
                fontSize: '0.9em',
                color: '#666',
                marginTop: '10px'
            }}>
                Share this Group ID with others to let them join the chat
            </p>
        </div>
    );

    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h1>Push Protocol Group Chat</h1>

            {/* Add connected wallet address display */}
            {user && (
                <div style={{
                    margin: '10px 0',
                    padding: '10px',
                    background: '#f5f5f5',
                    borderRadius: '5px'
                }}>
                    Connected: {user.address?.slice(0, 6)}...{user.address?.slice(-4)}
                </div>
            )}

            <div style={{
                margin: '20px 0',
                padding: '10px',
                background: '#f0f0f0',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                Status: {status}
                {!user && (
                    <button
                        onClick={connectWallet}
                        disabled={loading}
                        style={{
                            background: loading ? '#cccccc' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '5px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Connect Wallet
                    </button>
                )}
            </div>

            {user && !groupId && (
                <div style={{
                    margin: '20px 0',
                    padding: '20px',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h2>Join Existing Group</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="Enter group ID"
                                value={joinGroupId}
                                onChange={(e) => setJoinGroupId(e.target.value)}
                                disabled={loading}
                                style={{
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '5px',
                                    flexGrow: 1
                                }}
                            />
                            <button
                                onClick={joinGroup}
                                disabled={loading || !joinGroupId}
                                style={{
                                    padding: '10px 20px',
                                    background: loading || !joinGroupId ? '#cccccc' : '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: loading || !joinGroupId ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Join Group
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px' }}>
                        <h2>Or Create New Group</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="Enter group name"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                disabled={loading}
                                style={{
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '5px',
                                    flexGrow: 1
                                }}
                            />
                            <button
                                onClick={createGroup}
                                disabled={loading || !groupName}
                                style={{
                                    padding: '10px 20px',
                                    background: loading || !groupName ? '#cccccc' : '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: loading || !groupName ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Create Group
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {groupId && <GroupInfo />}

            {groupId && (
                <div style={{ marginTop: '20px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="Enter member's wallet address"
                            value={memberAddress}
                            onChange={(e) => setMemberAddress(e.target.value)}
                            disabled={loading}
                            style={{
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '5px',
                                flexGrow: 1
                            }}
                        />
                        <button
                            onClick={addMember}
                            disabled={loading || !memberAddress}
                            style={{
                                padding: '10px 20px',
                                background: loading || !memberAddress ? '#cccccc' : '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: loading || !memberAddress ? 'not-allowed' : 'pointer',
                                marginLeft: '10px'
                            }}
                        >
                            Add Member
                        </button>
                    </div>

                    <div style={{
                        height: '400px',
                        overflowY: 'auto',
                        border: '1px solid #ddd',
                        padding: '10px',
                        margin: '20px 0',
                        borderRadius: '5px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {messages.map((msg, index) => {
                            // Skip messages with invalid or empty content
                            if (!msg.message?.content || msg.message.content === '...') {
                                return null;
                            }

                            const isOwnMessage = msg.origin === 'self';
                            const messageTime = msg.timestamp ? new Date(Number(msg.timestamp)).toLocaleTimeString() : '';
                            const messageContent = msg.message?.content || '';
                            
                            // Extract wallet address from DID, removing the 'eip155:' prefix
                            const walletAddress = msg.from?.split(':').pop() || '';
                            
                            // Show full address for own messages, shortened for others
                            const displayAddress = isOwnMessage 
                                ? walletAddress 
                                : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

                            return (
                                <div
                                    key={index}
                                    style={{
                                        margin: '10px 0',
                                        padding: '10px',
                                        borderRadius: '5px',
                                        maxWidth: '80%',
                                        background: isOwnMessage ? '#1976d2' : '#f5f5f5',
                                        color: isOwnMessage ? 'white' : 'black',
                                        marginLeft: isOwnMessage ? 'auto' : '0',
                                        alignSelf: isOwnMessage ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '12px',
                                        color: isOwnMessage ? '#e3f2fd' : '#666',
                                        marginBottom: '5px'
                                    }}>
                                        {displayAddress}
                                    </div>
                                    <div style={{ 
                                        wordBreak: 'break-word',
                                        marginBottom: '5px'
                                    }}>
                                        {messageContent}
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: isOwnMessage ? '#e3f2fd' : '#999',
                                        textAlign: 'right'
                                    }}>
                                        {messageTime}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '10px'
                    }}>
                        <input
                            type="text"
                            placeholder="Type your message"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                            disabled={loading}
                            style={{
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '5px',
                                flexGrow: 1
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !newMessage}
                            style={{
                                padding: '10px 20px',
                                background: loading || !newMessage ? '#cccccc' : '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: loading || !newMessage ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PushChat;