"use client"
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DAO_CONTRACT, DAO_ABI } from '@/utils/DAOconstants';

export default function DatasetTrainingDAOUI() {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [tokenContract, setTokenContract] = useState(null);
    const [account, setAccount] = useState('');
    const [tokenBalance, setTokenBalance] = useState('0');
    const [status, setStatus] = useState('');

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

    useEffect(() => {
        if (account) {
            loadData();
        }
    }, [account, contract]);

    const connectWallet = async () => {
        try {
            setStatus('Connecting wallet...');
            if (!window.ethereum) {
                throw new Error('Please install MetaMask');
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const daoContract = new ethers.Contract(contractAddress, DAO_ABI, signer);
            const tokenAddr = await daoContract.token();
            const tokenContract = new ethers.Contract(tokenAddr, [
                "function balanceOf(address account) external view returns (uint256)",
                "function symbol() external view returns (string)"
            ], signer);

            setProvider(provider);
            setSigner(signer);
            setContract(daoContract);
            setTokenContract(tokenContract);
            setAccount(await signer.getAddress());
            setStatus('Connected!');
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        }
    };

    const loadData = async () => {
        try {
            // Load token balance
            const balance = await tokenContract.balanceOf(account);
            const symbol = await tokenContract.symbol();
            setTokenBalance(`${ethers.formatEther(balance)} ${symbol}`);

            // Load user trainings
            const trainings = await contract.getUserTrainings(account);
            setTrainings(trainings);

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
        <div className="container mx-auto p-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Dataset Training DAO</h1>

            {!account ? (
                <button
                    onClick={connectWallet}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Connect Wallet
                </button>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Account Info</h2>
                        <div className="space-y-2">
                            <p>Connected: {account}</p>
                            <p>Balance: {tokenBalance}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Record Training</h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Dataset ID"
                                value={datasetId}
                                onChange={(e) => setDatasetId(e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                            <input
                                type="text"
                                placeholder="Model Type"
                                value={modelType}
                                onChange={(e) => setModelType(e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                            <button
                                onClick={recordTraining}
                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Submit Training
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Create Proposal</h2>
                        <div className="space-y-4">
                            <textarea
                                placeholder="Proposal Description"
                                value={proposalDesc}
                                onChange={(e) => setProposalDesc(e.target.value)}
                                className="w-full p-2 border rounded"
                                rows="3"
                            />
                            <button
                                onClick={createProposal}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Create Proposal
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Your Trainings</h2>
                        <div className="space-y-2">
                            {trainings.map((training, index) => (
                                <div key={index} className="p-2 border rounded">
                                    <p>Dataset: {training.datasetId}</p>
                                    <p>Model: {training.modelType}</p>
                                    <p>Time: {new Date(Number(training.timestamp) * 1000).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Proposals</h2>
                        <p className="text-gray-600 mb-4">
                            All proposals have a voting period of 3 days from creation.
                            Members can vote for or against during this period.
                        </p>
                        <div className="space-y-4">
                            {proposals.map((proposal) => (
                                <div key={proposal.id} className="p-4 border rounded">
                                    <div className="mb-3">
                                        <span className="text-sm text-gray-500">Proposal #{proposal.id}</span>
                                        <h3 className="font-bold text-lg mt-1">{proposal.description}</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <p className="text-sm text-gray-600">For:</p>
                                            <p className="font-semibold">{proposal.forVotes ? ethers.formatEther(proposal.forVotes) : '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Against:</p>
                                            <p className="font-semibold">{proposal.againstVotes ? ethers.formatEther(proposal.againstVotes) : '0'}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Ends: {new Date(Number(proposal.endTime) * 1000).toLocaleString()}
                                    </p>
                                    {!proposal.executed && (
                                        <div className="mt-2 space-x-2">
                                            <button
                                                onClick={() => vote(proposal.id, true)}
                                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
                                            >
                                                Vote For
                                            </button>
                                            <button
                                                onClick={() => vote(proposal.id, false)}
                                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                                            >
                                                Vote Against
                                            </button>

                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {status && (
                        <div className="mt-4 p-4 bg-gray-100 rounded">
                            <p>{status}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}