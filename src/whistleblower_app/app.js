/**
 * @author Andrei-Stefan Blindu
 */

(() => {

    function hashPassword(password) {
        var CryptoJS = require('crypto-js');

        var algo = CryptoJS.algo.SHA256.create();
        var salt = "SUPER-S@LT!";
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

        const address = "0xC3072C8cf69c83e734c40160Ca7d6a62519e8B0e"
        const abi = require('../../build/contracts/SmartContract.json').abi;

        // Set up a web3 contract, representing our deployed contract instance
        const myContract = new web3.eth.Contract(abi, address);
        console.log(myContract);

        var response = await myContract.methods.action(hashedPassword)
        .call();
        //.send({ from: accounts[0], gas: 5, gasPrice: 20000000000 });
        return response;
    }

    window.onload = () => {
        document.getElementById("submitButton").addEventListener("click", () => {
            var password = document.getElementById("password").value;
            console.log(password);

            var hashedPassword = hashPassword(password);
            console.log(hashedPassword);

            executeContractAction(hashedPassword).then((response) => {
                document.getElementById("response").innerText = response;
            });
        });
    }

})();