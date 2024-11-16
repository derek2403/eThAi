// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract RandomSequenceGenerator is IEntropyConsumer {
    event SequenceRequested(uint64 sequenceNumber, uint256 arraySize);
    event SequenceGenerated(uint64 sequenceNumber, uint256[] sequence);

    IEntropy private entropy;
    address private provider;
    
    // Mapping to store sequence requests
    mapping(uint64 => uint256) private pendingRequests;
    
    constructor(address _entropy, address _provider) {
        entropy = IEntropy(_entropy);
        provider = _provider;
    }

    function requestSequence(uint256 size, bytes32 userRandomNumber) external payable {
        require(size > 0, "Size must be greater than 0");
        
        // Get the required fee
        uint128 requestFee = entropy.getFee(provider);
        require(msg.value >= requestFee, "Insufficient fee");

        // Request random number from Entropy
        uint64 sequenceNumber = entropy.requestWithCallback{value: requestFee}(
            provider,
            userRandomNumber
        );
        
        // Store the request
        pendingRequests[sequenceNumber] = size;
        
        emit SequenceRequested(sequenceNumber, size);
    }

    function getFee() external view returns (uint256) {
        return entropy.getFee(provider);
    }

    // Fisher-Yates shuffle algorithm using the random number as seed
    function generateShuffledSequence(uint256 size, bytes32 randomNumber) internal pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](size);
        
        // Initialize array with sequential numbers
        for (uint256 i = 0; i < size; i++) {
            array[i] = i + 1;
        }
        
        // Shuffle using Fisher-Yates algorithm
        for (uint256 i = size - 1; i > 0; i--) {
            // Generate a random index using the random number and current position
            bytes32 hash = keccak256(abi.encodePacked(randomNumber, i));
            uint256 j = uint256(hash) % (i + 1);
            
            // Swap elements
            uint256 temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        
        return array;
    }

    function entropyCallback(
        uint64 sequenceNumber,
        address _providerAddress,
        bytes32 randomNumber
    ) internal override {
        uint256 size = pendingRequests[sequenceNumber];
        require(size > 0, "Invalid sequence number");
        
        // Generate the shuffled sequence
        uint256[] memory shuffledSequence = generateShuffledSequence(size, randomNumber);
        
        // Clean up
        delete pendingRequests[sequenceNumber];
        
        // Emit the result
        emit SequenceGenerated(sequenceNumber, shuffledSequence);
    }

    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    receive() external payable {}
}