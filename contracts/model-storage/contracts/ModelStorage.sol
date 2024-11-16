// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ModelStorage {
    struct Model {
        string modelName;
        string datasetName;
        address trainer;
        uint256 timestamp;
        uint256 mse;
        uint256 rmse;
        uint256 rSquared;
    }

    mapping(bytes32 => Model) public models;
    event ModelStored(bytes32 indexed modelId, address trainer, string datasetName);

    function storeModel(
        string memory modelName,
        string memory datasetName,
        uint256 mse,
        uint256 rmse,
        uint256 rSquared
    ) public returns (bytes32) {
        bytes32 modelId = keccak256(abi.encodePacked(modelName, datasetName, block.timestamp, msg.sender));
        
        models[modelId] = Model({
            modelName: modelName,
            datasetName: datasetName,
            trainer: msg.sender,
            timestamp: block.timestamp,
            mse: mse,
            rmse: rmse,
            rSquared: rSquared
        });

        emit ModelStored(modelId, msg.sender, datasetName);
        return modelId;
    }

    function getModel(bytes32 modelId) public view returns (
        string memory modelName,
        string memory datasetName,
        address trainer,
        uint256 timestamp,
        uint256 mse,
        uint256 rmse,
        uint256 rSquared
    ) {
        Model memory model = models[modelId];
        return (
            model.modelName,
            model.datasetName,
            model.trainer,
            model.timestamp,
            model.mse,
            model.rmse,
            model.rSquared
        );
    }
}