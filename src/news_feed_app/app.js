/**
 * @author Andrei-Stefan Blindu
 */

(() => {

    var forge = require('node-forge');

    function NonceException(message) {
        this.message = message;
        this.name = 'Nonce Exception';
    }

    NonceException.prototype.toString = function() {
        return '${this.name}: "${this.message}"';
    }

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

    async function getPublicKeyFromSmartContract(myContract) {
        let publicKey = "";
        let publicKeySubstringsNumber = await myContract.methods.getPublicKeySubstringsNumber().call();
        console.log(publicKeySubstringsNumber);
        for (let i=0; i < publicKeySubstringsNumber; i++) {
            publicKey += (await myContract.methods.publicKey(i).call());
        }
        return publicKey;
    }

    function verifyAndRemoveNonce(value) {
        // retrieve nonce from where it was saved
        let nonce = localStorage.getItem('nonce');
        
        let nonceLength = nonce.length;
        let valueLength = value.length;

        if (value.substring(valueLength-nonceLength, valueLength) === nonce) {
            // return the value string without the nonce
            return value.substring(0, valueLength-nonceLength);
        } else {
            // if the nonce is not valid throws an exception
            throw new NonceException("nonce is not valid!");
        }
    }

    function decryptShare(encryptedPartialKey, publicKeyPem) {
        
        // Decode base64 encoding
        //var enc_share_x = atob(encryptedPartialKey[0]);   atob is deprecated
        var enc_share_x = forge.util.decode64(encryptedPartialKey[0]);
        var enc_share_y = forge.util.decode64(encryptedPartialKey[1]);
        console.log(enc_share_x);
        console.log(enc_share_y);

        const key = forge.pki.privateKeyFromPem(publicKeyPem);

        // Decryption
        var share_x = key.decrypt(enc_share_x); 
        var share_y = key.decrypt(enc_share_y);
        console.log(share_x);
        console.log(share_y);

        // Now I have share_x = value + nonce (same for share_y)
        // I have to evaluate the nonce and then remove it
        try {
            share_x = verifyAndRemoveNonce(share_x);
            share_y = verifyAndRemoveNonce(share_y);
        } catch(err) {
            // if the nonce is not valid throws an exception
            throw new NonceException("nonce not valid");
        }

        return [parseInt(share_x), parseInt(share_y)];
    }

    function decryptPartialKeys(encryptedPartialKeys, publicKey, sharesNumber) {
        var partialKeys = [];
        for (let i=0; i < sharesNumber; i++) {
            try {
                partialKeys.push(decryptShare(encryptedPartialKeys[i], publicKey));
            } catch(err) {
                console.log(err);
            }
        }
        return partialKeys;
    }

    async function requestSecretFromSmartContract() {
        const Web3 = require('web3');
        // Set up web3 object, connected to the local development network
        //const web3 = new Web3('http://localhost:7545');
        var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

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

        var encryptedPartialKeys = [];
        var secretKey;

        if (sharesNumber >= threshold) {
            // Get horcrux public key from the smart contract
            var publicKey = await getPublicKeyFromSmartContract(myContract);
            console.log(publicKey);

            // Get the partial keys from the smart contract
            for (let i=0; i < sharesNumber; i++) {
                encryptedPartialKeys.push(await myContract.methods.partialKeys(i).call());
            }
            console.log("Encrypted partial keys :");
            console.log(encryptedPartialKeys);
            
            var partialKeys = decryptPartialKeys(encryptedPartialKeys, publicKey, sharesNumber);
            console.log(partialKeys);

            secretKey = reconstructSecret(partialKeys, threshold);
            document.getElementById("secret").innerHTML = "<h3>Secret key : </h3>" + secretKey;

        } else {
            console.log("There are not enough partial keys to reconstruct the secret decryption key yet!");
            document.getElementById("secret").innerHTML = 
            "There are not enough partial keys to reconstruct the secret decryption key yet!";
        }

        return secretKey;

    }

    window.onload = () => {
        var secretKey = requestSecretFromSmartContract();
    }

})();