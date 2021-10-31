/**
 * @author Andrei-Stefan Blindu
 */

(() => {

    var CryptoJS = require('crypto-js');

    var passwordInhibit = "";
    var passwordLock = "";
    //var passwordUnlock = "";
    var passwordImmediateReveal = "";
    var key = "";
    var timeout = 0;
    var hash = "";

    const address = require('../../build/contracts/SmartContract.json').networks[5777].address;
    const abi = require('../../build/contracts/SmartContract.json').abi;

    // total number of shares
    const TOTALE_SHARES  = 5;
    // the minimum required to recover
    const THRESHOLD = 3;

    var horcruxPublicKey;
    var horcruxPrivateKey;
    var nonce = "";

    async function activateSmartContract() {
        const Web3 = require('web3');
        // Set up web3 object, connected to the local development network
        //const web3 = new Web3('http://localhost:7545');
        var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
        // Retrieve accounts from the local node
        const accounts = await web3.eth.getAccounts();
        console.log(accounts);

        // Set up a web3 contract, representing our deployed contract instance
        const myContract = new web3.eth.Contract(abi, address);
        console.log(myContract);

        const value = await myContract.methods.fileHash().call();
        console.log(value);

        await myContract.methods.setTimeout(timeout)
        .send({ from: accounts[0] });   // , gas: 50000, gasPrice: 20000000000

        await myContract.methods.setPasswordInhibit(passwordInhibit)
        .send({ from: accounts[0] });

        await myContract.methods.setPasswordLock(passwordLock)
        .send({ from: accounts[0] });

        //await myContract.methods.setPasswordUnlock(passwordUnlock)
        //.send({ from: accounts[0] });

        await myContract.methods.setPasswordImmediateReveal(passwordImmediateReveal)
        .send({ from: accounts[0] });

        await myContract.methods.setFileHash(hash)
        .send({ from: accounts[0] });

        await myContract.methods.setThreshold(THRESHOLD)
        .send({ from: accounts[0] });  

        // Since the key is very long we cannot send it in a single transaction but we have
        // to divide it in smaller substrings
        let i=0;
        let step=30;
        do {
            await myContract.methods.setPublicKey(horcruxPublicKey.substring(i, i+step))
            .send({ from: accounts[0] });
            i += step;
        } while(i < horcruxPublicKey.length)

        console.log("Smart Contract activated and parameters successfully uploaded!");
    }

    function generateRandomString(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (let i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    function generateRSAKeys() {
        var forge = require('node-forge');

        let keyPair = forge.pki.rsa.generateKeyPair(1024);  // generate 1024 bits key pair
        let encryptionKey = keyPair.publicKey;  // In RSA public key is usually used for encryption
        let decryptionKey = keyPair.privateKey; // In RSA private key is usually used for decryption

        // Here we are going to exchange the use of the keys, since it's not important to hide the message but
        // to be sure that the message comes from an horcrux,
        // so we are going to use RSA public/encryption key as private key
        // and RSA private/decryption key as public key
        horcruxPrivateKey = forge.pki.publicKeyToPem(encryptionKey);
        horcruxPublicKey = forge.pki.privateKeyToPem(decryptionKey);
        // the private key is going to be sent to the horcruxes together with the shamir's partial key and the nonce
        // while the public key is going to be put on the smart contract

        // Now we generate the nonce that is a short random generated string that will allow us
        // to identify that a message is coming from an authorized horcrux and not from a fake one
        nonce = generateRandomString(2);
        // the nonce is saved in local storage
        window.localStorage.setItem('nonce', nonce);
    }

    function hashPassword(password, index) {
        var algo = CryptoJS.algo.SHA256.create();
        var crypto = require("crypto");

        // salt is a random generated 10 bytes string
        var salt = crypto.randomBytes(10).toString('hex'); 
        // we save the generated salt in a local storage
        window.localStorage.setItem('salt_'+index, salt);  

        
        // il salt non deve essere uguale per tutti (per evitare attacchi brute-froce con approcci stat)
        // uso generatore pseudo random con id sequenziale, uno corrispondente a ogni password
        // in questo modo il salt sarebbe diverso per le varie password
        // oppure salvare i salt in locale

        algo.update(password, 'utf-8');
        algo.update(CryptoJS.SHA256(salt), 'utf-8');
        // we could use a cryptographic algorithm better than sha256 but is adeguate
        
        return algo.finalize().toString(CryptoJS.enc.Base64);
    }

    function encryptFile(fileContent) {
        // The crypto-js library encrypt function expects string as input. 
        // I convert the ArrayBuffer to WordArray, and to string
        var wordArray = CryptoJS.lib.WordArray.create(fileContent);
        // Then I encrypt the wordArray with the choosen key using AES encryption
        // and convert it to string
        return CryptoJS.AES.encrypt(wordArray, key).toString();  
    }

    function upload2IPFS(content) {
        const ipfsAPI = require('ipfs-api');
        // connect to ipfs daemon API server
        const ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'});

        // create buffer from encrypted file content
        let buffer = new Buffer(content);

        // add file to IPFS
        ipfs.files.add(buffer, function (err, file) {
            if (err) {
                console.log(err);
                document.getElementById("resultMessage").innerHTML = "Something went wrong : "+err;
            } else {
                // get the hash of the uploaded file
                // through the hash we can retrieve the file from IPFS
                hash = file[0].hash;
                document.getElementById("resultMessage").innerHTML = 
                "Your data was successfully encrypted and your file uploaded to IPFS!"
                document.getElementById("fileHash").innerHTML = "The hash of your secret file is : "+hash;
                return(hash);
            }
        })

    }

    function encryptAndUpload2IPFS(file) {
        let reader = new FileReader();
        // we encrypt the content of the file when we open it to read it
        reader.onload = function(e) {
            var encrypted = encryptFile(e.target.result);
            console.log(encrypted); // print the encrypted content of the file
            // we finally upload the encrypted content of the file to IPFS
            upload2IPFS(encrypted);
        }
        reader.readAsArrayBuffer(file); 
    }

    function generateCoefficients(secret) {
        var coefficients = [];
        coefficients.push(secret);
        for (let i=1; i < THRESHOLD; i++) {
            coefficients.push(Math.floor(Math.random() * 100000));
        }
        console.log(coefficients);
        return coefficients;
    }

    function polynom(x, coefficients) {
        var y = 0;

        for (let i=0; i < coefficients.length; i++) {
            y += coefficients[i] * Math.pow(x, i);
        }

        return y;
    }

    // Splits the secret key in many shares according to Shamir's algorithm
    function generateShares(secret) {
        var shares = [];
        var coefficients = generateCoefficients(secret);

        for (let i=1; i <= TOTALE_SHARES; i++) {
            let x = Math.floor(Math.random() * 100000);
            shares.push([x, polynom(x, coefficients)])
        }

        return shares;
    }

    function sendPartialKey2Device(partialKey, deviceId) {
        const basePort = 5000;
        // every devices listens to a different port (basePort + deviceId)
        const url = "http://localhost:"+(basePort+deviceId)+"/sharePartialKeys";

        // together with the partialKey we send also the private key and 
        // the nonce to the horcruxes
        // and also the smart contract address and abi
        fetch(url, {
            method: "POST",                
            body: JSON.stringify({ 
                "partialKey" : partialKey, 
                "privateKey" : horcruxPrivateKey,
                "nonce" : nonce,
                "address" : address,
                "abi" : abi
            }),
            headers: {"Content-Type": "application/json"}
        }).catch((error) => {
            console.log(error);
        });
    }

    function sendPartialKeys2Devices(partialKeys) {
        for (let i=0; i < TOTALE_SHARES; i++) {
          sendPartialKey2Device(partialKeys[i], i);
        }
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

    function shamirSecretSharing(secret) {
        /*const { split, join } = require('shamir');
        const { randomBytes } = require('crypto');

        // convert between string and Uint8Array
        const utf8Encoder = new TextEncoder();

        const utf8Decoder = new TextDecoder();
        
        const secretBytes = utf8Encoder.encode(secret);
        // parts is a object whos keys are the part number and 
        // values are shares of type Uint8Array
        console.log("secretBytes : " + secretBytes);

        const partialKeys = split(randomBytes, TOTALE_SHARES, THRESHOLD, secretBytes);
        console.log("Partial Keys : ");
        console.log(partialKeys);

        const recovered = join(partialKeys);
        console.log(utf8Decoder.decode(recovered));

        // send partial keys to devices
        var partialKeysArray = Array.from(partialKeys);
        sendPartialKeys2Devices(partialKeysArray);*/

        var secretValue = parseInt(secret);

        do {
            var shares = generateShares(secretValue);
            console.log(shares);

            let recontruction = reconstructSecret(shares, THRESHOLD);
            console.log(recontruction);

            var err = recontruction - secret;
            console.log("error : %d", err);
        } while(err != 0);

        sendPartialKeys2Devices(shares);

    }

    // Function that reorders an array randomly
    function shuffle(array) {
        let currentIndex = array.length,  randomIndex;
      
        // While there remain elements to shuffle...
        while (currentIndex != 0) {
      
          // Pick a remaining element...
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex--;
      
          // And swap it with the current element.
          [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
        }
      
        return array;
      }

    window.onload = () => {

        document.getElementById("uploadData").style.display = "block";
        document.getElementById("generateSmartContract").style.display = "none";

        document.getElementById("uploadButton").addEventListener("click", () => {
            var indexArray = shuffle([0,1,2]);
            document.getElementById("index0").innerHTML = indexArray[0];
            document.getElementById("index1").innerHTML = indexArray[1];
            document.getElementById("index2").innerHTML = indexArray[2];

            passwordInhibit = hashPassword(document.getElementById("passwordInhibit").value, indexArray[0]);
            passwordLock = hashPassword(document.getElementById("passwordLock").value, indexArray[1]);
            //passwordUnlock = hashPassword(document.getElementById("passwordUnlock").value);
            passwordImmediateReveal = hashPassword(document.getElementById("passwordImmediateReveal").value, indexArray[2]);

            timeout = document.getElementById("timeout").value * document.getElementById("timeUnit").value;

            let file = document.getElementById("fileInput").files[0];

            // random generated key
            key = "" + Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER/100));  // key must be a string
            console.log(key);

            encryptAndUpload2IPFS(file);

            document.getElementById("uploadData").style.display = "none";
            document.getElementById("generateSmartContract").style.display = "block";

            document.getElementById("secretKey").innerHTML = "  "+key;
            document.getElementById("secretKey").style.display = "none";
            document.getElementById("secretKeyButtonText").innerHTML = "SHOW SECRET KEY"   
            
        });

        document.getElementById("confirmButton").addEventListener("click", () => {
            console.log(timeout);
            console.log(passwordInhibit);
            console.log(passwordLock);
            //console.log(passwordUnlock);
            console.log(passwordImmediateReveal);
            console.log("File Hash : "+hash);

            // Generate public-private key pair and nonce for horcrux
            generateRSAKeys();
            console.log(horcruxPrivateKey);
            console.log(horcruxPublicKey);
            console.log(nonce);

            // Activate smart contract on the blockchain and set the parameters
            activateSmartContract();
                
            // Split the secret key in partial keys with Shamir's algorithm 
            // and share them with the devices
            shamirSecretSharing(key);
            
        });

        document.getElementById("showKeyButton").addEventListener("click", () => {
            if (document.getElementById("secretKeyButtonText").innerHTML == "SHOW SECRET KEY") {
                document.getElementById("secretKeyButtonText").innerHTML = "HIDE SECRET KEY";
                document.getElementById("secretKey").style.display = "block";
            } else {
                document.getElementById("secretKeyButtonText").innerHTML = "SHOW SECRET KEY";
                document.getElementById("secretKey").style.display = "none";
            }
        });

        document.getElementById("backButton").addEventListener("click", () => {
            document.getElementById("uploadData").style.display = "block";
            document.getElementById("generateSmartContract").style.display = "none";
        });
    }
})();