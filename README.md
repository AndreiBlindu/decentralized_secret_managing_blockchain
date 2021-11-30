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


## Compile and deploy Smart Contracts to Ethereum
### Ganache
Download Ganache https://www.trufflesuite.com/ganache in order to run a local blockchain.
### Truffle
Install truffle : npm install -g truffle

Compile contracts : truffle compile

Deploy contracts : truffle migrate --reset (with Ganache running)


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

## How to run the project
### 1. Compile smart contracts and deploy to Ganache
1.a) run Ganache
1.b) truffle compile
2.c) truffle migrate --reset

### 2. Update contract abi seen by the js scripts
Inside src/web_platform, src/whistleblower_app, src/newsfeed_app run the following command : 
browserify app.js -o bundle.js

### 3. Activate 5 devices and run web_platform
3.a) cd src/devices
3.b) python horcrux_device.py 0 
3.c) open other 4 terminals and do the same with parameters 1,2,3,4
3.d) cd src/web_platform
3.e) run index.html

### 4. Run whisleblower's app
4.a) cd src/whisleblower_app
4.b) run index.html

### 5. Run news feed app
5.a) cd src/news_feed_app
5.b) run index.html

