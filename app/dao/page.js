"use client"
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DAO_CONTRACT, DAO_ABI } from '../../utils/DAOconstants';
import { Header } from '../../components/Header';
import styles from '../../styles/dao.css';

export default function DatasetTrainingDAOUI() {
    // Form states
    const [datasetId, setDatasetId] = useState('');
    const [modelType, setModelType] = useState('');
    const [proposalDesc, setProposalDesc] = useState('');
    const [selectedProposal, setSelectedProposal] = useState(null);

    // Data states
    const [trainings, setTrainings] = useState([]);
    const [proposals, setProposals] = useState([]);

    // Contract address - replace with your deployed contract address
    const contractAddress = DAO_CONTRACT;

    // Add status state
    const [status, setStatus] = useState('');
    const [contract, setContract] = useState(null);

    useEffect(() => {
        // Initialize contract and load data directly
        initializeContract();
    }, []);

    const initializeContract = async () => {
        try {
            // Check if window.ethereum is available
            if (!window.ethereum) {
                throw new Error("Please install MetaMask to use this dApp");
            }

            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // Create Web3Provider and get signer
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Create contract instance with signer
            const daoContract = new ethers.Contract(contractAddress, DAO_ABI, signer);
            setContract(daoContract);
            
            // Load initial data
            try {
                const proposalCount = await daoContract.proposalCount();
                const proposals = [];
                for (let i = 0; i < proposalCount; i++) {
                    const proposal = await daoContract.getProposal(i);
                    proposals.push({
                        id: i,
                        description: proposal[0],
                        forVotes: proposal[1],
                        againstVotes: proposal[2],
                        endTime: proposal[3],
                        executed: proposal[4]
                    });
                }
                setProposals(proposals);
            } catch (error) {
                console.error("Error loading proposals:", error);
                setStatus("Error loading proposals. Please check your connection and try again.");
            }
            
        } catch (error) {
            console.error("Error initializing contract:", error);
            setStatus(error.message || "Error connecting to wallet");
        }
    };

    const loadData = async () => {
        try {
            if (!contract) return;

            // Load proposals
            const proposalCount = await contract.proposalCount();
            const proposals = [];
            for (let i = 0; i < proposalCount; i++) {
                const [description, forVotes, againstVotes, endTime, executed] = await contract.getProposal(i);
                proposals.push({
                    id: i,
                    description,
                    forVotes,
                    againstVotes,
                    endTime,
                    executed
                });
            }
            setProposals(proposals);
        } catch (error) {
            setStatus(`Error loading data: ${error.message}`);
        }
    };

    const recordTraining = async () => {
        try {
            setStatus('Recording training...');
            const tx = await contract.recordTraining(datasetId, modelType);
            await tx.wait();
            setStatus('Training recorded successfully!');
            setDatasetId('');
            setModelType('');
            loadData();
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        }
    };

    const createProposal = async () => {
        try {
            setStatus('Creating proposal...');
            const tx = await contract.createProposal(proposalDesc);
            await tx.wait();
            setStatus('Proposal created successfully!');
            setProposalDesc('');
            loadData();
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        }
    };

    const calculateEndTime = (proposal) => {
        // Get the current block timestamp as creation time
        const creationTime = Math.floor(Date.now() / 1000); // Current time in seconds
        const votingPeriod = 3 * 24 * 60 * 60; // 3 days in seconds
        return new Date((creationTime + votingPeriod) * 1000).toLocaleString();
    };

    const vote = async (proposalId, support) => {
        try {
            setStatus('Voting...');
            const tx = await contract.vote(proposalId, support);
            await tx.wait();
            setStatus('Vote recorded successfully!');
            loadData();
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        }
    };

    const executeProposal = async (proposalId) => {
        try {
            setStatus('Executing proposal...');
            const tx = await contract.executeProposal(proposalId);
            await tx.wait();
            setStatus('Proposal executed successfully!');
            loadData();
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div>
            <Header />
            <div className="dao-container">
                {status && <div className="status-message">{status}</div>}
                <div className="content-wrapper">
                    <div className="page-header">
                        <h1 className="page-title">Dataset Training DAO</h1>
                    </div>
                    
                    <div className="dashboard-layout">
                        <div className="actions-row">
                            <div className="action-card">
                                <div className="card-header">
                                    <h2 className="card-title">
                                        <span className="card-icon">📊</span>
                                        Record Training
                                    </h2>
                                </div>
                                <div className="card-content">
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            placeholder="Dataset ID"
                                            value={datasetId}
                                            onChange={(e) => setDatasetId(e.target.value)}
                                            className="input-field"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Model Type"
                                            value={modelType}
                                            onChange={(e) => setModelType(e.target.value)}
                                            className="input-field"
                                        />
                                        <button
                                            onClick={recordTraining}
                                            className="action-button success-button"
                                        >
                                            Submit Training
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="action-card">
                                <div className="card-header">
                                    <h2 className="card-title">
                                        <span className="card-icon">📝</span>
                                        Create Proposal
                                    </h2>
                                </div>
                                <div className="card-content">
                                    <div className="input-group">
                                        <textarea
                                            placeholder="Proposal Description"
                                            value={proposalDesc}
                                            onChange={(e) => setProposalDesc(e.target.value)}
                                            className="input-field textarea-field"
                                        />
                                        <button
                                            onClick={createProposal}
                                            className="action-button primary-button"
                                        >
                                            Create Proposal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="trainings-section">
                            <div className="section-card">
                                <div className="card-header">
                                    <h2 className="card-title">
                                        <span className="card-icon">🎯</span>
                                        Your Trainings
                                    </h2>
                                </div>
                                <div className="card-content trainings-grid">
                                    {trainings.map((training, index) => (
                                        <div key={index} className="training-item">
                                            <div className="training-content">
                                                <div className="training-header">
                                                    <span className="training-id">Dataset: {training.datasetId}</span>
                                                    <span className="training-type">{training.modelType}</span>
                                                </div>
                                                <div className="training-time">
                                                    {new Date(Number(training.timestamp) * 1000).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="proposals-section">
                            <div className="section-card">
                                <div className="card-header sticky-header">
                                    <h2 className="card-title">
                                        <span className="card-icon">🗳️</span>
                                        Active Proposals
                                    </h2>
                                </div>
                                <div className="proposals-scroll">
                                    {proposals.map((proposal) => (
                                        <div key={proposal.id} className="proposal-card">
                                            <div className="proposal-header">
                                                <span className="proposal-id">Proposal #{proposal.id}</span>
                                                <h3 className="proposal-description">{proposal.description}</h3>
                                            </div>
                                            <div className="votes-grid">
                                                <div className="vote-box">
                                                    <div className="vote-label">For</div>
                                                    <div className="vote-value">
                                                        {proposal.forVotes ? ethers.formatEther(proposal.forVotes) : '0'}
                                                    </div>
                                                </div>
                                                <div className="vote-box">
                                                    <div className="vote-label">Against</div>
                                                    <div className="vote-value">
                                                        {proposal.againstVotes ? ethers.formatEther(proposal.againstVotes) : '0'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="proposal-footer">
                                                <div className="proposal-deadline">
                                                    Ends: {new Date(Number(proposal.endTime) * 1000).toLocaleString()}
                                                </div>
                                                {!proposal.executed && (
                                                    <div className="vote-actions">
                                                        <button
                                                            onClick={() => vote(proposal.id, true)}
                                                            className="vote-button vote-for"
                                                        >
                                                            Vote For
                                                        </button>
                                                        <button
                                                            onClick={() => vote(proposal.id, false)}
                                                            className="vote-button vote-against"
                                                        >
                                                            Vote Against
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}