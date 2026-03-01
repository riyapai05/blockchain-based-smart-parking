const HDWalletProvider = require("@truffle/hdwallet-provider");
require("dotenv").config();

module.exports = {
  networks: {

    // Local Ganache
    development: {
      host: "127.0.0.1",
      port: 7545,        // Ganache GUI default
      network_id: "*",
      gas: 8000000
    },

    // Sepolia Testnet
    sepolia: {
      provider: () => new HDWalletProvider({
        mnemonic: {
          phrase: process.env.MNEMONIC
        },
        providerOrUrl: process.env.SEPOLIA_RPC_URL, // HTTPS only
        numberOfAddresses: 2,
        shareNonce: false,
        pollingInterval: 8000
      }),

      network_id: 11155111,
      confirmations: 1,
      timeoutBlocks: 500,
      networkCheckTimeout: 1000000,
      skipDryRun: true,

      gas: 5000000,
      gasPrice: 10000000000 // 10 gwei
    }
  },

  mocha: {
    timeout: 1000000
  },

  compilers: {
    solc: {
      version: "0.8.16",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};