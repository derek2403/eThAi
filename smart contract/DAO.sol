// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Token for the DAO
contract TrainingToken is ERC20 {
    constructor() ERC20("AI Training Token", "TRAIN") {}

    // Mint tokens - only DAO can call this
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Main DAO Contract
contract DatasetTrainingDAO is Ownable(msg.sender) {  // Fixed: Added constructor parameter
    struct TrainingRecord {
        string datasetId;
        string modelType;
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
    
    event TrainingCompleted(address indexed user, string datasetId, string modelType);
    event ProposalCreated(uint256 indexed proposalId, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor() {
        token = new TrainingToken();
    }

    // Record a new training session and reward tokens
    function recordTraining(
        string memory datasetId,
        string memory modelType
    ) external {
        TrainingRecord memory newRecord = TrainingRecord({
            datasetId: datasetId,
            modelType: modelType,
            timestamp: block.timestamp,
            verified: true // In a real implementation, you'd want verification logic
        });

        userTrainings[msg.sender].push(newRecord);

        // Mint tokens as reward
        token.mint(msg.sender, TOKENS_PER_TRAINING);

        // Emit event for Push Protocol notification
        emit TrainingCompleted(msg.sender, datasetId, modelType);
    }

    // Create a new proposal
    function createProposal(string memory description) external returns (uint256) {
        require(token.balanceOf(msg.sender) >= 10 * 10**18, "Need 10 tokens to create proposal");
        
        uint256 proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.description = description;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        
        emit ProposalCreated(proposalId, description);
        return proposalId;
    }

    // Vote on a proposal
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

    // Execute a proposal
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting still active");
        require(!proposal.executed, "Already executed");
        require(proposal.forVotes > proposal.againstVotes, "Proposal failed");
        
        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }

    // View functions
    function getUserTrainings(address user) external view returns (
        TrainingRecord[] memory
    ) {
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