// config/index.js
export const CONFIG = {
    CHAINS: {
      "421614": {
        name: "Arbitrum Sepolia",
        contractAddress: "0x88A324A86BDf128bf0a842eC4B4C41F0C9B7c56f",
        endpointId: 40231,
        endpointAddress: "0x6EDCE65403992e310A62460808c4b910D972f10f"
      },
      "80002": {
        name: "Polygon Amoy",
        contractAddress: "0x97C106A11B5C88CdcF57AFa553e7AD9dAA4D08E6",
        endpointId: 40267,
        endpointAddress: "0x6EDCE65403992e310A62460808c4b910D972f10f"
      }
    }
  };
  
  export const CONTRACT_ABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_endpoint",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_owner",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "InvalidDelegate",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidEndpointCall",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidMessageLength",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidMsgType",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes",
          "name": "options",
          "type": "bytes"
        }
      ],
      "name": "InvalidOptions",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "LzTokenUnavailable",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "eid",
          "type": "uint32"
        }
      ],
      "name": "NoPeer",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "msgValue",
          "type": "uint256"
        }
      ],
      "name": "NotEnoughNative",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "addr",
          "type": "address"
        }
      ],
      "name": "OnlyEndpoint",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "eid",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "sender",
          "type": "bytes32"
        }
      ],
      "name": "OnlyPeer",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        }
      ],
      "name": "SafeERC20FailedOperation",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint32",
              "name": "eid",
              "type": "uint32"
            },
            {
              "internalType": "uint16",
              "name": "msgType",
              "type": "uint16"
            },
            {
              "internalType": "bytes",
              "name": "options",
              "type": "bytes"
            }
          ],
          "indexed": false,
          "internalType": "struct EnforcedOptionParam[]",
          "name": "_enforcedOptions",
          "type": "tuple[]"
        }
      ],
      "name": "EnforcedOptionSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "message",
          "type": "string"
        },
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "senderEid",
          "type": "uint32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "sender",
          "type": "bytes32"
        }
      ],
      "name": "MessageReceived",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "message",
          "type": "string"
        },
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "dstEid",
          "type": "uint32"
        }
      ],
      "name": "MessageSent",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "eid",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "peer",
          "type": "bytes32"
        }
      ],
      "name": "PeerSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "message",
          "type": "string"
        },
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "dstEid",
          "type": "uint32"
        }
      ],
      "name": "ReturnMessageSent",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "SEND",
      "outputs": [
        {
          "internalType": "uint16",
          "name": "",
          "type": "uint16"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "SEND_ABA",
      "outputs": [
        {
          "internalType": "uint16",
          "name": "",
          "type": "uint16"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint32",
              "name": "srcEid",
              "type": "uint32"
            },
            {
              "internalType": "bytes32",
              "name": "sender",
              "type": "bytes32"
            },
            {
              "internalType": "uint64",
              "name": "nonce",
              "type": "uint64"
            }
          ],
          "internalType": "struct Origin",
          "name": "origin",
          "type": "tuple"
        }
      ],
      "name": "allowInitializePath",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "_eid",
          "type": "uint32"
        },
        {
          "internalType": "uint16",
          "name": "_msgType",
          "type": "uint16"
        },
        {
          "internalType": "bytes",
          "name": "_extraOptions",
          "type": "bytes"
        }
      ],
      "name": "combineOptions",
      "outputs": [
        {
          "internalType": "bytes",
          "name": "",
          "type": "bytes"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "data",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes",
          "name": "encodedMessage",
          "type": "bytes"
        }
      ],
      "name": "decodeMessage",
      "outputs": [
        {
          "internalType": "string",
          "name": "message",
          "type": "string"
        },
        {
          "internalType": "uint16",
          "name": "msgType",
          "type": "uint16"
        },
        {
          "internalType": "uint256",
          "name": "extraOptionsStart",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "extraOptionsLength",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_message",
          "type": "string"
        },
        {
          "internalType": "uint16",
          "name": "_msgType",
          "type": "uint16"
        },
        {
          "internalType": "bytes",
          "name": "_extraReturnOptions",
          "type": "bytes"
        }
      ],
      "name": "encodeMessage",
      "outputs": [
        {
          "internalType": "bytes",
          "name": "encoded",
          "type": "bytes"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "endpoint",
      "outputs": [
        {
          "internalType": "contract ILayerZeroEndpointV2",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "eid",
          "type": "uint32"
        },
        {
          "internalType": "uint16",
          "name": "msgType",
          "type": "uint16"
        }
      ],
      "name": "enforcedOptions",
      "outputs": [
        {
          "internalType": "bytes",
          "name": "enforcedOption",
          "type": "bytes"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint32",
              "name": "srcEid",
              "type": "uint32"
            },
            {
              "internalType": "bytes32",
              "name": "sender",
              "type": "bytes32"
            },
            {
              "internalType": "uint64",
              "name": "nonce",
              "type": "uint64"
            }
          ],
          "internalType": "struct Origin",
          "name": "",
          "type": "tuple"
        },
        {
          "internalType": "bytes",
          "name": "",
          "type": "bytes"
        },
        {
          "internalType": "address",
          "name": "_sender",
          "type": "address"
        }
      ],
      "name": "isComposeMsgSender",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "nextNonce",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "nonce",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "oAppVersion",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "senderVersion",
          "type": "uint64"
        },
        {
          "internalType": "uint64",
          "name": "receiverVersion",
          "type": "uint64"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "eid",
          "type": "uint32"
        }
      ],
      "name": "peers",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "peer",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "_dstEid",
          "type": "uint32"
        },
        {
          "internalType": "uint16",
          "name": "_msgType",
          "type": "uint16"
        },
        {
          "internalType": "string",
          "name": "_message",
          "type": "string"
        },
        {
          "internalType": "bytes",
          "name": "_extraSendOptions",
          "type": "bytes"
        },
        {
          "internalType": "bytes",
          "name": "_extraReturnOptions",
          "type": "bytes"
        },
        {
          "internalType": "bool",
          "name": "_payInLzToken",
          "type": "bool"
        }
      ],
      "name": "quote",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "nativeFee",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lzTokenFee",
              "type": "uint256"
            }
          ],
          "internalType": "struct MessagingFee",
          "name": "fee",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "_dstEid",
          "type": "uint32"
        },
        {
          "internalType": "uint16",
          "name": "_msgType",
          "type": "uint16"
        },
        {
          "internalType": "string",
          "name": "_message",
          "type": "string"
        },
        {
          "internalType": "bytes",
          "name": "_extraSendOptions",
          "type": "bytes"
        },
        {
          "internalType": "bytes",
          "name": "_extraReturnOptions",
          "type": "bytes"
        }
      ],
      "name": "send",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_delegate",
          "type": "address"
        }
      ],
      "name": "setDelegate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint32",
              "name": "eid",
              "type": "uint32"
            },
            {
              "internalType": "uint16",
              "name": "msgType",
              "type": "uint16"
            },
            {
              "internalType": "bytes",
              "name": "options",
              "type": "bytes"
            }
          ],
          "internalType": "struct EnforcedOptionParam[]",
          "name": "_enforcedOptions",
          "type": "tuple[]"
        }
      ],
      "name": "setEnforcedOptions",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "_eid",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "_peer",
          "type": "bytes32"
        }
      ],
      "name": "setPeer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ];

// Helper function to convert address to bytes32 format for setPeer
export const addressToBytes32 = (address) => {
    return '0x' + address.slice(2).padStart(64, '0');
};