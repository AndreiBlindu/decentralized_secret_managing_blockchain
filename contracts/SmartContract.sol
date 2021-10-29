// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

/**
@author : Andrei-Stefan Blindu
 */

contract SmartContract {
    string public fileHash;     // hash to retrieve the encrypted file from IPFS
    //uint256 public secretKey; (not needed)    // key to decrypt the secret file

    string private passwordInhibit;  // to inhibit revelation for a certain time (timeout)
    string private passwordLock;    // to disable revelation for undefined time
    //string private passwordUnlock;  // to enable revelation
    string private passwordImmediateReveal; // to reveal instantly

    bool private enableRevelation = true;
    uint256 public timeout; 
    uint256 private timeSpan;   // time span the secret remains inhibited for   
    int private requestCounter = 0;

    struct PartialKey {     // define the structure of a partialKey
        uint256 x;
        uint256 y;
    }

    PartialKey[] public partialKeys;  // dynamic size array that stores the partial keys received by the devices
    uint public THRESHOLD;   // minimum numeber of shares required to reconstruct the secret
    uint public currentSharesNumber = 0;    // current number of partial keys in the smart contract
    string[] public publicKey;    // public key that decrypts the shares encrypted by horcruxes with their private key
    // it's an array because since it's a very long string there's the risk of going out of gas if we get it from a 
    // single big transaction so we divide it in smaller substrings


    function setEnableRevelation(bool _flag) private {
        enableRevelation = _flag;
        /*if (_flag) {
            // if revelation was disabled just setting enableRevelation to true is not enough,
            // we have to update the timeout to a future value as well
            setTimeout(timeSpan);
        }*/
    }

    function instantRevelation() private {
        // by setting the timeout to the current timestamp I make it expire
        timeout = block.timestamp;
        enableRevelation = true;
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
        /*else if (keccak256(abi.encodePacked(_password)) == keccak256(abi.encodePacked(passwordUnlock))) {
            setEnableRevelation(true);
            return string(abi.encodePacked("Secret revelation enabled. The secret will be revealed ",
                                            timeSpan, " seconds from now"));
        }*/
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

    
    // FUNCTIONS THAT ALLOW THE SMART CONTRACT TO RECEIVE PARTIAL KEYS FROM THE DEVICES
    // AND USE THEM TO RECONSTRUCT THE SECRET KEY
    function sendPartialKey(uint256 _partialKey_x, uint256 _partialKey_y) public {
        PartialKey memory partialKey = PartialKey(_partialKey_x, _partialKey_y);
        partialKeys.push(partialKey);
        currentSharesNumber = partialKeys.length;
    }

    // FUNCTION THAT RETURNS THE NUMBER OF SUBSTRINGS OF THE PUBLIC KEY
    function getPublicKeySubstringsNumber() public view returns (uint) {
        return publicKey.length;
    }
    

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
    /*function setPasswordUnlock(string memory _passwordUnlock) public {
        passwordUnlock = _passwordUnlock;
    }*/
    function setPasswordImmediateReveal(string memory _passwordImmediateReveal) public {
        passwordImmediateReveal = _passwordImmediateReveal;
    }
    function setTimeout(uint256 _time) public {
        timeSpan = _time;
        timeout = block.timestamp + timeSpan;
    }
    function setThreshold(uint _threshold) public{
        THRESHOLD = _threshold;
    }
    function setPublicKey(string memory _publicKey) public {
        publicKey.push(_publicKey);
    }
}