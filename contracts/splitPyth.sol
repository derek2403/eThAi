// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.27;

import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract DatasetShuffler is IEntropyConsumer {
    event SequenceRequested(uint64 sequenceNumber, uint256 arraySize);
    event SequenceGenerated(uint64 sequenceNumber, uint256[] sequence);
    event ShuffledDataReturned(uint64 sequenceNumber, uint256 numSplits, uint256[][][] splitData);
    
    struct ShuffleRequest {
        uint256 numSplits;
        bool pending;
    }
    
    IEntropy private entropy;
    address private provider;
    
    uint256[][] private dataRows;
    mapping(uint64 => ShuffleRequest) private pendingRequests;
    
    constructor(address _entropy, address _provider) {
        entropy = IEntropy(_entropy);
        provider = _provider;
        
        dataRows = new uint256[][](5);
        dataRows[0] = [6, 50, 45, 296, 250000];
        dataRows[1] = [7, 35, 32, 252, 300000];
        dataRows[2] = [4, 51, 14, 429, 717329];
        dataRows[3] = [4, 14, 43, 282, 576730];
        dataRows[4] = [2, 25, 41, 299, 731139];
    }
    
    function requestShuffle(
        uint256 numSplits,
        bytes32 userRandomNumber
    ) external payable {
        require(numSplits >= 2 && numSplits <= dataRows.length, "Invalid number of splits");
        
        uint128 requestFee = entropy.getFee(provider);
        require(msg.value >= requestFee, "Insufficient fee");
        
        uint64 sequenceNumber = entropy.requestWithCallback{value: requestFee}(
            provider,
            userRandomNumber
        );
        
        pendingRequests[sequenceNumber] = ShuffleRequest({
            numSplits: numSplits,
            pending: true
        });
        
        emit SequenceRequested(sequenceNumber, dataRows.length);
    }
    
    function getFee() external view returns (uint256) {
        return entropy.getFee(provider);
    }
    
    function generateShuffledData(bytes32 randomNumber, uint256 numSplits) 
        internal 
        view 
        returns (uint256[] memory, uint256[][][] memory) 
    {
        uint256 size = dataRows.length;
        uint256[] memory sequence = new uint256[](size);
        
        // Initialize sequence
        for(uint256 i = 0; i < size; i++) {
            sequence[i] = i;
        }
        
        // Fisher-Yates shuffle
        for(uint256 i = size - 1; i > 0; i--) {
            bytes32 hash = keccak256(abi.encodePacked(randomNumber, i));
            uint256 j = uint256(hash) % (i + 1);
            
            uint256 temp = sequence[i];
            sequence[i] = sequence[j];
            sequence[j] = temp;
        }
        
        // Create splits
        uint256 rowsPerSplit = size / numSplits;
        uint256[][][] memory splits = new uint256[][][](numSplits);
        
        for(uint256 i = 0; i < numSplits; i++) {
            uint256 startIdx = i * rowsPerSplit;
            uint256 endIdx = i == numSplits - 1 ? size : (i + 1) * rowsPerSplit;
            splits[i] = new uint256[][](endIdx - startIdx);
            
            for(uint256 j = 0; j < endIdx - startIdx; j++) {
                splits[i][j] = dataRows[sequence[startIdx + j]];
            }
        }
        
        return (sequence, splits);
    }
    
    function entropyCallback(
        uint64 sequenceNumber,
        address,
        bytes32 randomNumber
    ) internal override {
        ShuffleRequest storage request = pendingRequests[sequenceNumber];
        require(request.pending, "Invalid sequence number");
        
        (uint256[] memory sequence, uint256[][][] memory splits) = generateShuffledData(
            randomNumber,
            request.numSplits
        );
        
        emit SequenceGenerated(sequenceNumber, sequence);
        emit ShuffledDataReturned(sequenceNumber, request.numSplits, splits);
        
        delete pendingRequests[sequenceNumber];
    }
    
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }
    
    function getDataRows() external view returns (uint256[][] memory) {
        return dataRows;
    }
    
    receive() external payable {}
}