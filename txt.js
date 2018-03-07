
// TODO  setup a file structure, maybe one pointer file, index all names, then other files which store the identities

// TODO import from somewhere else or just uport-js client
// TODO remove address from local network and have the prompt make sense for it
const networks = {
  "Main Network": {
    "id": "0x1",
    "registry": "0xab5c8051b9a1df1aab0149f8b0630848b7ecabf6",
    "identityManager": "0x22a4d688748845e9d5d7394a0f05bc583adf4656",
    "rpcUrl": "https://mainnet.infura.io"
  },
  "Ropsten Test Network": {
    "id": "0x3",
    "registry": "0x41566e3a081f5032bdcad470adb797635ddfe1f0",
    "identityManager": "0x27500ae27b6b6ad7de7d64b1def90f3e6e7ced47",
    "rpcUrl": "https://ropsten.infura.io"
  },
  "Kovan Test Network": {
    "id": "0x2a",
    "registry": "0x5f8e9351dc2d238fb878b6ae43aa740d62fc9758",
    "identityManager": "0xdb55d40684e7dc04655a9789937214b493a2c2c6",
    "rpcUrl": "https://kovan.infura.io"
  },
  "Rinkeby Test Network": {
    "id": "0x4",
    "registry": "0x2cc31912b2b0f3075a87b3640923d45a26cef3ee",
    "identityManager": "0x19aece3ae41ee33c30f331906b7e4bb578946a55",
    "rpcUrl": "https://rinkeby.infura.io"
  },
  "Local Test Network": {
    "id": "0x5777",
    "registry": "0x3f22a64e75a1c4bbb5894a4882aef240c6fea01c",
    "identityManager": "0x0ddd27df7dd974920876dec2891b19c2ebfc37b9",
    "rpcUrl": "http://127.0.0.1:7545"
  },
  "Custom Network": {
  }
}

const network = [{
    type : 'list',
    name : 'networkid',
    choices: ["Main Network", "Ropsten Test Network", "Kovan Test Network", "Rinkeby Test Network", "Local Test Network", "Custom Network"],
    message : 'Choose a network for your identity:'
  }]

const networkConfirm = [{
    type : 'confirm',
    name : 'netConfirm',
    message : 'Do you want to change the default configuration? '
  }]

// TODO add defaults, defaults will be set base on selected network
const networkConfig = [
  {
    type : 'input',
    name : 'id',
    message : 'Enter network id: '
  },
  {
    type : 'input',
    name : 'rpcUrl',
    message : 'Enter rpcUrl: '
  },
  {
    type : 'input',
    name : 'registry',
    message : 'Enter registry address: '
  },
  {
    type : 'input',
    name : 'identityManager',
    message : 'Enter idnetity manager adress: '
  }
]

const networkConfigRPC = [
  {
    type : 'input',
    name : 'rpcUrl',
    message : 'Enter rpcUrl: '
  }
]

// Communicate that this optional
const networkDeploy = [{
    type : 'confirm',
    name : 'deployConfirm',
    message : 'Do you want to deploy the uport platform contracts on this network? '
  }]

const ipfsConfirm  = [{
    type : 'confirm',
    name : 'ipfsConfirm',
    message : `Is this ipfs configuration what you want to use? `
  }]

const ipfsConfig  = [
  {
    type : 'input',
    name : 'ipfsUrl',
    message : 'Enter ipfs url:'
  }]

const appConfirm = [{
    type : 'confirm',
    name : 'appConfirm',
    message : 'Are you creating an app identity? '
  }]

const fundContinue = [{
    type : 'confirm',
    name : 'fund',
    message : 'Press y to continue: '
  }]

const appConfig  = [
  {
    type : 'input',
    name : 'name',
    message : 'Enter app name:'
  },
  {
    type : 'input',
    name : 'description',
    message : 'Enter app description:'
  },
  {
    type : 'input',
    name : 'url',
    message : 'Enter app url:'
  },
  {
    type : 'input',
    name : 'imagepath',
    message : 'Enter app image path:'
  }
]

const modifyDDOPrompt = (ddo) => {
  return {
    type : 'list',
    name : 'key',
    choices: [
      `Name: ${ddo.name || 'No Value'}`,
      `Description: ${ddo.description || 'No Value'}`,
      `Url: ${ddo.url || 'No Value'}`,
      `Image: ${ddo.image || 'No Value'}`
    ],
    message : 'Which value(s) do you want to change?'
  }
}

const changePrompt = (promptVal) => {
  return [{
   type : 'input',
   name : 'val',
   message : `Current Value: ${promptVal} \n  Enter your new value: `
 }]
}

const changeImagePrompt = (promptVal) => {
  return [{
    type : 'input',
    name : 'val',
    message : `Current Value: ${promptVal} \n  Enter new value as path to local file, it will be uploaded to ipfs: `
  }]
}

const modifyConfigPrompt = (config) => {
  return {
    type : 'list',
    name : 'key',
    choices: [
      `RPC Url: ${config.rpcUrl || 'No Value'}`,
      `IPFS Url: ${config.ipfsUrl || 'No Value'}`,
    ],
    message : 'Which value(s) do you want to change?'
  }
}

module.exports = { networks,
                   network,
                   networkConfirm,
                   networkConfig,
                   networkConfigRPC,
                   networkDeploy,
                   ipfsConfirm,
                   ipfsConfig,
                   appConfirm,
                   fundContinue,
                   appConfig,
                   modifyDDOPrompt,
                   changePrompt,
                   changeImagePrompt,
                   modifyConfigPrompt
                 }
