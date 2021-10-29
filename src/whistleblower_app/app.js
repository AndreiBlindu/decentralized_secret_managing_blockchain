/**
 * @author Andrei-Stefan Blindu
 */

(() => {

    function hashPassword(password, index) {
        var CryptoJS = require('crypto-js');

        var algo = CryptoJS.algo.SHA256.create();

        // get the right salt from local storage
        var salt = window.localStorage.getItem('salt_'+index);
        console.log(salt);

        algo.update(password, 'utf-8');
        algo.update(CryptoJS.SHA256(salt), 'utf-8');
        
        return algo.finalize().toString(CryptoJS.enc.Base64);
    }

    async function executeContractAction(hashedPassword) {
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

        var response = await myContract.methods.action(hashedPassword)
        .call();
        //.send({ from: accounts[0] });
        console.log(response);
        return response;
    }

    window.onload = () => {
        document.getElementById("submitButton").addEventListener("click", () => {
            var password = document.getElementById("password").value;
            console.log(password);

            var index = document.getElementById("saltIndex").value;

            var hashedPassword = hashPassword(password, index);
            console.log(hashedPassword);

            executeContractAction(hashedPassword).then((response) => {
                document.getElementById("response").innerText = response;
            });
        });
    }

})();