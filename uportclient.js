#!/usr/bin/env node
const UPortClient = require("uport-mock-client").UPortClient
const serializeUportClient = require("uport-mock-client").serialize
const deserializeUportClient = require("uport-mock-client").deserialize
const genKeyPair = require("uport-mock-client").genKeyPair
const program = require("commander")
const inquirer = require('inquirer');
const deploy = require("uport-mock-client").deploy
const fs = require("fs")

let uportClient

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
    "id": "5777",
    "registry": "0x3f22a64e75a1c4bbb5894a4882aef240c6fea01c",
    "identityManager": "0x0ddd27df7dd974920876dec2891b19c2ebfc37b9",
    "rpcUrl": "http://127.0.0.1:7545"
  },
  "Custom Network": {
  }
}

const ipfsUrl = 'https://ipfs.infura.io/ipfs/'

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

let deviceKeysy

program
  .command('create <fileName>')
  .description('Create a new uPort client identity and save it to <fileName>.')
  .action(function(fileName){
    // Create config object
    let config = { network: {}}

    inquirer.prompt(network).then(answers => {
        if (answers.networkid === 'Custom Network') {
          inquirer.prompt(networkDeploy).then(answers => {
            if (answers.deployConfirm === true) config.deploy = true
            return inquirer.prompt(networkConfigRPC)
          }).then(answers => {
            config.network.rpcUrl = answers.rpcUrl
            return inquirer.prompt(ipfsConfirm)
          })
        }

        const net = networks[answers.networkid]

        console.log(`\nYou selected ${answers.networkid}, the following is the default configuration \n`)
        console.log(net)
        console.log('\n')

        // Overwritten with non defaults
        config.network = net

        return inquirer.prompt(networkConfirm).then(answers => {
          if (answers.netConfirm === false) {

            console.log(`\n The following is the default ipfs configuration: \n \n ipfsUrl = ${ipfsUrl}\n`)
            return inquirer.prompt(ipfsConfirm)
          }
          return inquirer.prompt(networkDeploy).then(answers => {
            if (answers.deployConfirm === true) {
              config.deploy = true
              return inquirer.prompt(networkConfigRPC)
            }
          }).then(answers => {
            config.network.rpcUrl = answers.rpcUrl
            console.log(`\n The following is the default ipfs configuration: \n  \n ipfsUrl = ${ipfsUrl}\n`)
            return inquirer.prompt(ipfsConfirm)
          })
        })
    }).then(answers => {
      if (answers.ipfsConfirm === true){
        config.ipfsConfig = ipfsUrl
        return inquirer.prompt(appConfirm)
      }
      return inquirer.prompt(ipfsConfig).then(answers => {
        config.ipfsConfig = answers.ipfsUrl
        return inquirer.prompt(appConfirm)
      })
    }).then(answers => {
      if (answers.appConfirm === false) {
        return
      }
      return inquirer.prompt(appConfig).then(answers => {
        config.appDDO = answers
        // TODO handle DDO Configuration
      })
    }).then(res => {
      config.deviceKeys = genKeyPair()

      // TODO give estimates for amount necessaryt to each creation below
      if (config.deploy === true ) {
        console.log(`\n Please fund the following address ${config.deviceKeys.address}. Then the contracts can be deployed and identity created \n`)
      } else {
        console.log(`\n Please fund the following address ${config.deviceKeys.address}. Then your identity can be created \n`)
      }
      return inquirer.prompt(fundContinue)
    }).then(res => {
      if (config.deploy === true ) {
        console.log('\n Deploying uPort platform contracts...')
        return deploy(config.network.rpcUrl, {from: config.deviceKeys.address}, config.deviceKeys.privateKey).then(res => {
          config.network.registry =  res.Registry
          console.log(`\n uPort registry contract configured and deployed at ${config.network.registry}`)
          config.network.identityManager  = res.IdentityManager
          console.log(`uPort Identity Manager contract configured and deployed at ${config.network.identityManager} \n`)

          // TODO better nonce management in client
          config.nonce = 2

          console.log('Initializing identity... \n')
          uportClient = new UPortClient(config)
          if (config.appDDO) {
            return uportClient.initializeIdentity(uportClient.appDDO(config.appDDO.name, config.appDDO.description, config.appDDO.url, config.appDDO.imgPath))
          } else {
            return uportClient.initializeIdentity()
          }
        })
      }

      // TODO redundant
      console.log('Initializing identity... \n')
      uportClient = new UPortClient(config)
      if (config.appDDO) {
        return uportClient.initializeIdentity(uportClient.appDDO(config.appDDO.name, config.appDDO.description, config.appDDO.url, config.appDDO.imgPath))
      } else {
        return uportClient.initializeIdentity()
      }

    }).then(res => {
      console.log(' \n uPort Identity Creeated! \n')
      // TODO pretty print the identity
      console.log(uportClient)

      let serialized = serializeUportClient(uportClient)
      console.log('\n Saving client')

      return writeFiles(fileName, serialized)
    }).then(res => {
      console.log('All Done!')
    })
  })


const writeFiles = (fileName, serialized) => new Promise((resolve, reject) => {
  fs.lstat('./uport-client', (err, stats) => {
    if (err) {
      fs.mkdir('./uport-client', (err) => {
        if(err) reject(err)
        const indexString = JSON.stringify({ identity: fileName })
        fs.writeFile('./uport-client/index.json', indexString, (err) => {
          if(err) reject(err);
          fs.writeFile(`./uport-client/${fileName}.json`, serialized, (err) => {
            if(err) reject(err);
            resolve()
          })
        })
      })
    } else {
      fs.writeFile('./uport-client/index.json', indexString, (err) => {
        if(err) reject(err);
        fs.writeFile(`./uport-client/${fileName}.json`, serialized, (err) => {
          if(err) reject(err);
          resolve()
        })
      })
    }
  })
})

program
  .command('consume <uri>')
  .description('Consume the message <uri> and process it')
  .action(function (uri) {
    // This function probably needs to display what you are
    // about to do and have a y/n type dialog before proceeding
    const serializedClient = fs.readFileSync(program.infile, 'utf8')
    uportClient = deserializeUportClient(serializedClient)

    uportClient.consume(uri).then(res => {
      console.log(res)
      // Reserialize the state to update nonce etc
      // Not sure if this is the best way to go about this...
      const serialized = serializeUportClient(uportClient)
      fs.writeFileSync(program.infile, serialized)
    })
})

program.option('-i, --infile <file>', 'File containing the serialized identity (required by the "consume" command)')
program.option('-c, --netconfig <file>', 'File containing the network config (required by the "create" command)')
program.option('-n, --netid <id>', 'Network ID as defined in network config file (required by the "create" command)')

program.parse(process.argv);
