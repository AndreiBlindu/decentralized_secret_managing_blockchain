# @author : Andrei-Stefan Blindu

import sys
import time

from web3 import Web3

from flask import Flask, request
from flask_cors import CORS
from flask_apscheduler import APScheduler

from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
import base64

import json

app = Flask(__name__)
CORS(app) # allow access from all domains to avoid cors policy errors

scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()


def check_smart_contract(partial_key, smart_contract, account):
    print("Checking smart contract ...")
    
    # check the contract to verify if the conditions for secret revelation are met
    if smart_contract.functions.checkReveal().call():
        print("Secret revealed! Sending partial keys ...")
        print(partial_key)
        # send the partial key to the smart contract
        smart_contract.functions.sendPartialKey(partial_key[0], partial_key[1]).transact({"from" : account})
        # once we sent the partial key we stop the checking task to avoid sending it many times
        scheduler.remove_job('0')
    else :
        print("Secret not revealed yet")

    time.sleep(2) # check the smart contract every 2 seconds


def encrypt_share(share, key_pem, nonce):
    key = RSA.importKey(key_pem)
    cipher = PKCS1_OAEP.new(key)

    # Separate the x and y components of the share
    # Add the nonce to them
    share_x = str(share[0]) + str(nonce) 
    share_y = str(share[1]) + str(nonce)

    # UTF-8 Encoding : because encryption works with bytes not strings
    # Then Encryption with the key received by the horcrux
    enc_share_x = cipher.encrypt(share_x.encode('utf-8'))
    enc_share_y = cipher.encrypt(share_y.encode('utf-8'))
    print(enc_share_x)
    print(enc_share_y)

    # After encryption Base64 Encode is used to get binary data into ASCII characters,
    # so our encrypted share can be easily trasmitted as text
    encrypted_share = [base64.b64encode(enc_share_x),base64.b64encode(enc_share_y)]
    #encrypted_share = [str(enc_share_x),str(enc_share_y)]
    return encrypted_share


# API to receive the partial keys
@app.route('/sharePartialKeys', methods=['POST'])
def receive_partial_keys():
    partial_key = request.get_json()['partialKey']
    encryption_key = request.get_json()['privateKey']
    nonce = request.get_json()['nonce']
    address = request.get_json()['address']
    abi = request.get_json()['abi']

    partial_key = encrypt_share(partial_key, encryption_key, nonce)

    # connect to the blockchain with web3
    web3_connection = Web3(Web3.HTTPProvider('http://localhost:7545'))
    account = web3_connection.eth.get_accounts()[0]
    if web3_connection.isConnected():
        smart_contract = web3_connection.eth.contract(address=address, abi=abi)
        if (smart_contract):
            # once it has the partial key and is connected to the smart contract it schedules the smart contract checking task
            app.apscheduler.add_job(func=check_smart_contract, trigger='interval', args=[partial_key, smart_contract, account], id='0')

    return "OK", 200


if __name__ == '__main__':
    basePort = 5000
    # we take the device id as a command line argument and sum it to the basePort to get the actual device port
    if len(sys.argv) > 1:
        devicePort = basePort + int(sys.argv[1])
    else:
        print("You must specify the device port as an argument")
        exit(-1)

    # every device is listening on a different port on localhost
    app.run(host='127.0.0.1', port=devicePort)