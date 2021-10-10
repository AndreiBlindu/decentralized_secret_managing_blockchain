(() => {

    var CryptoJS = require('crypto-js');

    var passwordInhibit = "";
    var passwordLock = "";
    var passwordUnlock = "";
    var passwordImmediateReveal = "";
    var key = "";
    var timeout = 0;
    var hash = "";

    // total number of shares
    const TOTALE_SHARES  = 5;
    // the minimum required to recover
    const THRESHOLD = 3;

    async function activateSmartContract() {
        const Web3 = require('web3');
        // Set up web3 object, connected to the local development network
        //const web3 = new Web3('http://localhost:7545');
        var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
        // Retrieve accounts from the local node
        const accounts = await web3.eth.getAccounts();
        console.log(accounts);

        
        const address = "0xC3072C8cf69c83e734c40160Ca7d6a62519e8B0e"

        const abi = require('../../build/contracts/SmartContract.json').abi;
        console.log(abi);

        // Set up a web3 contract, representing our deployed contract instance
        const myContract = new web3.eth.Contract(abi, address);
        console.log(myContract);

        const value = await myContract.methods.fileHash().call();
        console.log(value);

        await myContract.methods.setTimeout(timeout)
        .send({ from: accounts[0], gas: 5, gasPrice: 20000000000 });

        await myContract.methods.setPasswordInhibit(passwordInhibit)
        .send({ from: accounts[0], gas: 5, gasPrice: 20000000000 });

        await myContract.methods.setPasswordLock(passwordLock)
        .send({ from: accounts[0], gas: 5, gasPrice: 20000000000 });

        await myContract.methods.setPasswordUnlock(passwordUnlock)
        .send({ from: accounts[0], gas: 5, gasPrice: 20000000000 });

        await myContract.methods.setPasswordImmediateReveal(passwordImmediateReveal)
        .send({ from: accounts[0], gas: 5, gasPrice: 20000000000 });

        await myContract.methods.setFileHash(hash)
        .send({ from: accounts[0], gas: 5, gasPrice: 20000000000 });
    }

    function hashPassword(password) {
        var algo = CryptoJS.algo.SHA256.create();
        var salt = "SUPER-S@LT!";
        algo.update(password, 'utf-8');
        algo.update(CryptoJS.SHA256(salt), 'utf-8');
        
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

    // Splits the secret key in many shares according to Shamir's algorithm
    function generateShares(secret) {
        var shares = [];

        for (let i=0; i < TOTALE_SHARES; i++) {
            let x = Math.floor(Math.random() * 1000000000000); // the x value of the points is a random number between 0 and 100000
            let y = secret;                       // I use Math.floor to avoid floating point approssimations as much as I can
            // we build the polinom : y = P(x) = secret + c1*x + ... + c_n * x^(threshold-1)
            for (let j=1; j < THRESHOLD; j++) {
                let coefficient = Math.floor(Math.random()*10);
                y += coefficient * Math.pow(x, j);
            }
            shares.push([x,y]);
        }

        return shares;
    }

    function sendPartialKey2Device(partialKey, deviceId) {
        const basePort = 5000;
        // every devices listens to a different port (basePort + deviceId)
        const url = "http://localhost:"+(basePort+deviceId)+"/sharePartialKeys";
        
        fetch(url, {
            method: "POST",                
            body: JSON.stringify({ partialKey : partialKey}),
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

    function shamirSecretSharing(secret) {
        /*const { split } = require('shamir');
        const { randomBytes } = require('crypto');

        // convert between string and Uint8Array
        const utf8Encoder = new TextEncoder();
        
        const secretBytes = utf8Encoder.encode(secret);
        // parts is a object whos keys are the part number and 
        // values are shares of type Uint8Array
        console.log("secretBytes : " + secretBytes);

        const partialKeys = split(randomBytes, PARTS, QUORUM, secretBytes);
        console.log("Partial Keys : ");
        console.log(partialKeys);
        console.log(partialKeys[0]);

        // write the partialKeys to config file
        //writeToFile(partialKeys);

        // send partial keys to devices
        //sendPartialKeys2Devices(partialKeys);*/

        var secretValue = parseInt(secret);

        var shares = generateShares(secretValue);
        console.log(shares);

        sendPartialKeys2Devices(shares);

    }

    window.onload = () => {

        document.getElementById("uploadData").style.display = "block";
        document.getElementById("generateSmartContract").style.display = "none";

        document.getElementById("uploadButton").addEventListener("click", () => {
            passwordInhibit = hashPassword(document.getElementById("passwordInhibit").value);
            passwordLock = hashPassword(document.getElementById("passwordLock").value);
            passwordUnlock = hashPassword(document.getElementById("passwordUnlock").value);
            passwordImmediateReveal = hashPassword(document.getElementById("passwordImmediateReveal").value);

            timeout = document.getElementById("timeout").value * document.getElementById("timeUnit").value;

            let file = document.getElementById("fileInput").files[0];
            // random generated key
            key = "" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);  // key must be a string
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
            console.log(passwordUnlock);
            console.log(passwordImmediateReveal);
            console.log("File Hash : "+hash);

            // Activate smart contract on the blockchain and set the parameters
            activateSmartContract();

            // Split the secret key in partial keys with Shamir's algorithm 
            // and write them in a config file
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