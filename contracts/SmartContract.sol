// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

/**
@author : Andrei-Stefan Blindu
 */

contract SmartContract {
    string public fileHash;     // hash to retrieve the encrypted file from IPFS
    string public secretKey;    // key to decrypt the secret file

    string private passwordInhibit;  // to inhibit revelation for a certain time (timeout)
    string private passwordLock;    // to disable revelation for undefined time
    string private passwordUnlock;  // to enable revelation
    string private passwordImmediateReveal; // to reveal instantly

    bool private enableRevelation = true;
    uint256 public timeout; 
    uint256 private timeSpan;   // time span the secret remains inhibited for   
    int private requestCounter = 0;   


    function setEnableRevelation(bool _flag) private {
        enableRevelation = _flag;
        if (_flag) {
            // if revelation was disabled just setting enableRevelation to true is not enough,
            // we have to update the timeout to a future value as well
            setTimeout(timeSpan);
        }
    }

    function instantRevelation() private {
        // by setting the timeout to the current timestamp I make it expire
        timeout = block.timestamp;
    }

    function inhibitRevelation() private {
        // we increase the timeout to inhibit revelation for one more time span
        timeout += timeSpan;
    }

    // FUNCTION THAT DECIDES WHAT ACTION TO EXECUTE ACCORDING TO THE PASSWORD INSERTED
    function action(string memory _password) public returns(string memory) {
        if (keccak256(abi.encodePacked(_password)) == keccak256(abi.encodePacked(passwordInhibit))) {
            inhibitRevelation();
            return string(abi.encodePacked("Secret inhibited for ", timeSpan, " seconds more"));
        }
        else if (keccak256(abi.encodePacked(_password)) == keccak256(abi.encodePacked(passwordLock))) {
            setEnableRevelation(false);
            return "Secret revelation disabled for undefined time";
        }
        else if (keccak256(abi.encodePacked(_password)) == keccak256(abi.encodePacked(passwordUnlock))) {
            setEnableRevelation(true);
            return string(abi.encodePacked("Secret revelation enabled. The secret will be revealed ",
                                            timeSpan, " seconds from now"));
        }
        else if (keccak256(abi.encodePacked(_password)) == keccak256(abi.encodePacked(passwordImmediateReveal))) {
            instantRevelation();
            return "The secret has been revealed!";
        } else {
            return "Unauthorized! The password inserted is not valid.";
        }
    }

    // CHECK IF THE CONDITIONS FOR REVELATION ARE MET 
    // This function is called by the devices that monitor the smart contract
    function checkReveal() public returns(bool){
        requestCounter++;   // modify the state of the contract in order to mine another block and update the timestamp
        return ((block.timestamp > timeout) && enableRevelation);
    }

    /**
    Qui devo scrivere le funzioni che permettono allo smart contract di ricevere le chiavi parziali dai dispositivi
    e di ricostruire la chiave segreta a partire da questi frammenti.
    Per ricevere le chiavi faccio una funzione che aggiunge a un array gli elementi passati come argomento,
    mentre per ricostruire il segreto dovrò usare l'interpolazione di Lagrange come previsto dall'algoritmo di Shamir.
     */


    // SETTERS
    function setFileHash(string memory _fileHash) public {
        fileHash = _fileHash;
    }
    function setPasswordInhibit(string memory _passwordInhibit) public {
        passwordInhibit = _passwordInhibit;
    }
    function setPasswordLock(string memory _passwordLock) public {
        passwordLock = _passwordLock;
    }
    function setPasswordUnlock(string memory _passwordUnlock) public {
        passwordUnlock = _passwordUnlock;
    }
    function setPasswordImmediateReveal(string memory _passwordImmediateReveal) public {
        passwordImmediateReveal = _passwordImmediateReveal;
    }
    function setTimeout(uint256 _time) public {
        timeSpan = _time;
        timeout = block.timestamp + timeSpan;
    }
}