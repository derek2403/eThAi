require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    scroll: {
      url: process.env.SCROLL_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 534351, 
      gasPrice: "auto"
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY
    },
    customChains: [
      {
        network: "scroll",
        chainId: 534351,
        urls: {
          apiURL: "https://scroll-sepolia.g.alchemy.com/v2/6U7t79S89NhHIspqDQ7oKGRWp5ZOfsNj",
          browserURL: "https://scroll-sepolia.blockscout.com/"
        }
      }
    ]
  }
};