# @author : Andrei-Stefan Blindu

import sys
import time

from flask import Flask, request
from flask_cors import CORS
from flask_apscheduler import APScheduler

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

# API to receive the partial keys
@app.route('/sharePartialKeys', methods=['POST'])
def receive_partial_keys():
    partial_key = request.get_json()['partialKey']
    print(partial_key)
    encryption_key = request.get_json()['privateKey']
    print(encryption_key)
    nonce = request.get_json()['nonce']
    print(nonce)
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