# Blockchain-Based Smart Parking System

This project implements a smart parking system using Solidity and Truffle. It supports deployment on both Ganache (local) and Sepolia testnet.

---

## Steps to Run the Project

1. Install Node.js (v18 recommended).

2. Clone the repository:
   git clone <your-repository-url>
   cd parking-project

3. Install dependencies:
   npm install

4. Create a `.env` file in the root folder and add:
   MNEMONIC=your_12_word_mnemonic
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

5. Start Ganache (GUI or CLI).

6. Compile the smart contracts:
   npm run compile

7. Deploy on local Ganache:
   npm run deploy

8. Run tests:
   npm run test

9. To deploy on Sepolia testnet:
   npm run deploy:sepolia

---

For reproducible results, use Ganache with a fixed mnemonic and the same Solidity compiler version (0.8.16).