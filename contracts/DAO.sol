// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { ISPHook } from "@ethsign/sign-protocol-evm/src/interfaces/ISPHook.sol";

// Token for the DAO
contract TrainingToken is ERC20 {
    constructor() ERC20("AI Training Token", "TRAIN") {}

    // Mint tokens - only DAO can call this
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Main DAO Contract
contract DatasetTrainingDAO is Ownable(msg.sender), ISPHook {  // Added ISPHook
    struct TrainingRecord {
        string modelName;
        string modelHash;
        string datasetHash;
        uint256 timestamp;
        bool verified;
    }

    struct Proposal {
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 endTime;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    TrainingToken public token;
    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant TOKENS_PER_TRAINING = 100 * 10**18; // 100 tokens per training
    
    mapping(address => TrainingRecord[]) public userTrainings;
    mapping(uint256 => Proposal) public proposals;
    mapping(string => bool) public verifiedModelHashes;
    mapping(string => bool) public verifiedDatasetHashes;

    event TrainingVerified(
        address indexed trainer,
        string modelName,
        string modelHash,
        string datasetHash,
        uint256 timestamp
    );
    event ProposalCreated(uint256 indexed proposalId, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor() {
        token = new TrainingToken();
    }

    // Sign Protocol Hook implementation
    function didReceiveAttestation(
        address attester,
        uint64 schemaId,
        uint64 attestationId,
        bytes calldata data
    ) external payable override {
        // Decode the attestation data
        (
            string memory modelHash,
            string memory datasetHash,
            string memory modelName,
            uint256 timestamp
        ) = abi.decode(data, (string, string, string, uint256));

        // Verify this is a new submission
        require(!verifiedModelHashes[modelHash], "Model already registered");
        require(!verifiedDatasetHashes[datasetHash], "Dataset already used");

        // Record the training
        TrainingRecord memory newRecord = TrainingRecord({
            modelName: modelName,
            modelHash: modelHash,
            datasetHash: datasetHash,
            timestamp: timestamp,
            verified: true
        });

        // Update state
        userTrainings[attester].push(newRecord);
        verifiedModelHashes[modelHash] = true;
        verifiedDatasetHashes[datasetHash] = true;

        // Mint tokens as reward
        token.mint(attester, TOKENS_PER_TRAINING);

        emit TrainingVerified(attester, modelName, modelHash, datasetHash, timestamp);
    }

    // Required interface implementations
    function didReceiveAttestation(
        address,
        uint64,
        uint64,
        IERC20,
        uint256,
        bytes calldata
    ) external pure override {
        revert("Not implemented");
    }

    function didReceiveRevocation(
        address,
        uint64,
        uint64,
        bytes calldata
    ) external payable override {
        revert("Revocations not supported");
    }

    function didReceiveRevocation(
        address,
        uint64,
        uint64,
        IERC20,
        uint256,
        bytes calldata
    ) external pure override {
        revert("Not implemented");
    }

    // DAO Functions
    function createProposal(string memory description) external returns (uint256) {
        require(token.balanceOf(msg.sender) >= 10 * 10**18, "Need 10 tokens to create proposal");
        
        uint256 proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.description = description;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        
        emit ProposalCreated(proposalId, description);
        return proposalId;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 voteWeight = token.balanceOf(msg.sender);
        require(voteWeight > 0, "No voting power");

        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.forVotes += voteWeight;
        } else {
            proposal.againstVotes += voteWeight;
        }
        
        emit Voted(proposalId, msg.sender, support);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting still active");
        require(!proposal.executed, "Already executed");
        require(proposal.forVotes > proposal.againstVotes, "Proposal failed");
        
        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }

    // View functions
    function getUserTrainings(address user) external view returns (TrainingRecord[] memory) {
        return userTrainings[user];
    }

    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 endTime,
        bool executed
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.endTime,
            proposal.executed
        );
    }
}