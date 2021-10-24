(() => {

    function reconstructSecret(f,n)
    {
        let result = 0; // Initialize result
    
        for (let i = 0; i < n; i++)
        {
            // Compute individual terms of the formula
            let term = f[i][1];
            for (let j = 0; j < n; j++)
            {
                if (j != i)
                    term = term*(f[j][0]) / (f[j][0] - f[i][0]);
            }
    
            // Add current term to result
            result += term;
        }
    
        return Math.round(result);
    }

    async function requestSecretFromSmartContract() {
        const Web3 = require('web3');
        // Set up web3 object, connected to the local development network
        //const web3 = new Web3('http://localhost:7545');
        var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
        // Retrieve accounts from the local node
        const accounts = await web3.eth.getAccounts();

        const address = require('../../build/contracts/SmartContract.json').networks[5777].address;
        console.log(address);
        const abi = require('../../build/contracts/SmartContract.json').abi;

        // Set up a web3 contract, representing our deployed contract instance
        const myContract = new web3.eth.Contract(abi, address);
        console.log(myContract);

        // Get the number of shares needed to reconstruct the secret from the smart contract
        var threshold = await myContract.methods.THRESHOLD().call();
        console.log(threshold);
        // Get the current number of partial keys
        var sharesNumber = await myContract.methods.currentSharesNumber().call();
        console.log(sharesNumber);
        // Get the partial keys from the smart contract
        var partialKeys = [];
        for (let i=0; i < sharesNumber; i++) {
            partialKeys.push(await myContract.methods.partialKeys(i).call());
        }
        console.log(partialKeys);

        var secretKey;

        if (partialKeys.length >= threshold) {
            // qui devo mettere codice per decrittare le chiavi parziali con la chiave pubblica messa sulla blockchain
            // e successivamente usarle per ricostruire la chiave segreta attraverso l'interpolazione di lagrange
        } else {
            console.log("There are not enough partial keys to reconstruct the secret decryption key yet!");
        }

        return secretKey;

    }

    window.onload = () => {
        var secretKey = requestSecretFromSmartContract();
    }

})();