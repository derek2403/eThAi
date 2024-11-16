export const GENERATOR_ADDRESS = "0x6C0dD73a59fbd714F32806af4daA62219AE7701d";

export const ABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_entropy",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_provider",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "sequenceNumber",
          "type": "uint64"
        },
        {
          "indexed": false,
          "internalType": "uint256[]",
          "name": "sequence",
          "type": "uint256[]"
        }
      ],
      "name": "SequenceGenerated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "sequenceNumber",
          "type": "uint64"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "arraySize",
          "type": "uint256"
        }
      ],
      "name": "SequenceRequested",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint64",
          "name": "sequence",
          "type": "uint64"
        },
        {
          "internalType": "address",
          "name": "provider",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "randomNumber",
          "type": "bytes32"
        }
      ],
      "name": "_entropyCallback",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getFee",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "size",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "userRandomNumber",
          "type": "bytes32"
        }
      ],
      "name": "requestSequence",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ]