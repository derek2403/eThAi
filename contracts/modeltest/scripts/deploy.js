const hre = require("hardhat");

async function main() {
  console.log("Deploying AIQueryResponse contract...");

  const AIQueryResponse = await hre.ethers.getContractFactory("AIQueryResponse");
  const aiQueryResponse = await AIQueryResponse.deploy();

  await aiQueryResponse.waitForDeployment();

  console.log("AIQueryResponse deployed to:", await aiQueryResponse.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });