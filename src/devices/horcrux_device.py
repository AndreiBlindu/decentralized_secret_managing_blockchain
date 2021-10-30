# @author : Andrei-Stefan Blindu

import sys
import time

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

## Devo mettere meccanismo per evitare che horcrux fake mandino info false
## Indentificare horcrux -> 
## La web app manda al horcrux un nonce e chiave pubblica (rsa) 
## la chiave privata ce l'hanno horc. e proprietario
## horc. cifrano con chiave privata part_shamir + nonce 
## dal nonce verifico che è un horcrux
## la pubblica viene messa sulla blockchain

def check_smart_contract(partial_key):
    print("Checking smart contract ...")
    print(partial_key)
    #
    # Devo scrivere il codice per monitorare periodicamento lo smart contract e per inviare le chiavi parziali
    # grazie alla libreria web3
    # Problema : errori nell'installazione di web3
    #
    time.sleep(10) # check the smart contract every 10 seconds

def encrypt_share(share, key_pem, nonce):
    key = RSA.importKey(key_pem)
    cipher = PKCS1_OAEP.new(key)

    # Separate the x and y components of the share
    # Add the nonce to them
    share_x = str(share[0]) + str(nonce) 
    share_y = str(share[1]) + str(nonce)
    print(share_x)
    print(share_y)

    # UTF-8 Encoding : because encryption works with bytes not strings
    # Then Encryption with the key received by the horcrux
    enc_share_x = cipher.encrypt(share_x.encode('utf-8'))
    enc_share_y = cipher.encrypt(share_y.encode('utf-8'))

    # After encryption Base64 Encode is used to get binary data into ASCII characters,
    # so our encrypted share can be easily trasmitted as text
    encrypted_share = [base64.b64encode(enc_share_x),base64.b64encode(enc_share_y)]
    return encrypted_share

# API to receive the partial keys
@app.route('/sharePartialKeys', methods=['POST'])
def receive_partial_keys():
    partial_key = request.get_json()['partialKey']
    print(partial_key)
    encryption_key = request.get_json()['privateKey']
    print(encryption_key)
    nonce = request.get_json()['nonce']
    print(nonce)

    partial_key = encrypt_share(partial_key, encryption_key, nonce)
    print(partial_key)

    # once it receives the partial key it schedules the smart contract checking task
    #app.apscheduler.add_job(func=check_smart_contract, trigger='interval', args=[partial_key], id='0')
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