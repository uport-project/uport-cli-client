# uport-cli-client
Minimal command-line based uPort client

## Installation

```
git clone git@github.com:uport-project/uport-cli-client.git
npm install
```

## Usage

### Print help message

```
node uportclient.js --help
```

### Create identity

```
node uportclient.js create clientfile.json --netconfig networkconfig.json --netid '5777'
```

This creates a new identity on a testrpc/ganache network with existing Registry and IdentityManager contracts and stores the relevant serialized data about the identity in the file `clientfile.json`.

### Use the identity by consuming URIs

```
node uportclient.js consume 'me.uport:0x07a4d1cfd3610c851825b78bac68d84e3a766555?value=1000000000000000000' -i clientfile.json
```

In this example we have the client defined in the file `clientfile.json` send 1 ETH to the address `0x07a4d1cfd3610c851825b78bac68d84e3a766555`.
