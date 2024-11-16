const hre = require("hardhat");

async function main() {
  try {
    console.log("Deploying ModelStorage contract...");
    
    const ModelStorage = await hre.ethers.getContractFactory("ModelStorage");
    const modelStorage = await ModelStorage.deploy();

    await modelStorage.waitForDeployment();
    const address = await modelStorage.getAddress();

    console.log("ModelStorage deployed to:", address);

    // Save the deployment address
    const fs = require('fs');
    const path = require('path');
    const deploymentsDir = './deployments';
    
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    const deployments = {
      amoy: {
        ModelStorage: address
      }
    };

    fs.writeFileSync(
      './deployments/addresses.json',
      JSON.stringify(deployments, null, 2)
    );

    console.log("Deployment address saved to deployments/addresses.json");
  } catch (error) {
    console.error("Deployment error:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});