// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { ISPHook } from "@ethsign/sign-protocol-evm/src/interfaces/ISPHook.sol";
import { IERC20 } from "@openzeppelin/contracts/interfaces/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract AttestationCounterHook is ISPHook, Ownable {
    // Mapping to store attestation counts per attester
    mapping(address => uint256) public attestationCounts;
    
    // Total attestations across all attesters
    uint256 public totalAttestations;
    
    // Event to emit when counter increases
    event AttestationCounted(address attester, uint256 newCount, uint256 newTotal);

    constructor() Ownable(msg.sender) {}

    // Function to get an attester's count
    function getAttesterCount(address attester) public view returns (uint256) {
        return attestationCounts[attester];
    }

    // Called when an attestation is created
    function didReceiveAttestation(
        address attester,
        uint64, // schemaId
        uint64, // attestationId
        bytes calldata // extraData
    ) external payable {
        _countAttestation(attester);
    }

    // Called when an attestation is created (ERC20 version)
    function didReceiveAttestation(
        address attester,
        uint64, // schemaId
        uint64, // attestationId
        IERC20, // resolverFeeERC20Token
        uint256, // resolverFeeERC20Amount
        bytes calldata // extraData
    ) external view {
        // This function must be defined but we don't need to implement counting here
        // as the other didReceiveAttestation will be called
    }

    // Called when an attestation is revoked
    function didReceiveRevocation(
        address, // attester
        uint64, // schemaId
        uint64, // attestationId
        bytes calldata // extraData
    ) external payable {
        // Optionally implement counter decrease on revocation
    }

    // Called when an attestation is revoked (ERC20 version)
    function didReceiveRevocation(
        address, // attester
        uint64, // schemaId
        uint64, // attestationId
        IERC20, // resolverFeeERC20Token
        uint256, // resolverFeeERC20Amount
        bytes calldata // extraData
    ) external view {
        // This function must be defined but we don't need to implement it
    }

    // Internal function to increment counters
    function _countAttestation(address attester) internal {
        attestationCounts[attester]++;
        totalAttestations++;
        
        emit AttestationCounted(
            attester, 
            attestationCounts[attester],
            totalAttestations
        );
    }
}