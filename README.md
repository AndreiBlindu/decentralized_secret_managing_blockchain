# Decentralized Secret Managing Blockchain

## Project components

### Smart Contract 
-> contracts/SmartContract.sol

Contains the logic for secret keeping and revelation under certain conditions.

It is uploaded to an Ethereum Blockchain (in this PoC I used Ganache to simulate a local blockchain)

### Web Platform 
-> src/web_platform

Allows us to set and hash the passwords, encrypt and upload the secret file to IPFS and split the encryption key using Shamir's Secret Sharing algorithm.

The hashed passwords, file hash (that allows us to retrieve it from IPFS) and other parameters are sent and memorized into the smart contract.

While the partial encryption keys are sent to a few "horcrux" devices (in this PoC simulated by python processes)

### Devices 
-> src/devices/horcrux_device.py

Each device receives a partial key and start monitoring the smart contract. 

When the conditions for secret revelation are met they send their partial keys to the smart contract that uses them to reconstruct the secret encryption key and expose it to the public.

### Whistleblower App 
-> src/whistleblower_app

Client that allows the whistleblower to trigger the desired actions on the smart contract by entering the appropriate passwords.

In this PoC it's not an actual app but a simple JS client.

### Newsfeed App
We suppose it to be a famous app used by the people potentially interested in the secret.

It searches for secrets in the blockchain, when a smart contract secret key has been exposed it uses it to decrypt the respective secret file stored on IPFS and reveals it to the users.

## Project dependencies

### Node modules
Install inside src/web_platform and src/whistleblower_app

#### Web3.js
You need Web3.js library to interact with an Ethereum smart contract from JavaScript through JSON/RPC communication protocol.

npm install web3

### Python libraries
Install inside src/devices

#### Flask dependencies
pip install flask

pip install flask_cors

pip install flask_apscheduler

#### Web3
pip install web3

