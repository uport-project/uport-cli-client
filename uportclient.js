#!/usr/bin/env node
const UPortClient = require("uport-client").UPortClient
const serializeUportClient = require("uport-client").serialize
const deserializeUportClient = require("uport-client").deserialize
const genKeyPair = require("uport-client").genKeyPair
const program = require("commander")
const inquirer = require('inquirer');
const deploy = require("uport-client").deploy
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
    "id": "0x5777",
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

const initFiles = () => new Promise((resolve, reject) => {
  fs.lstat('./uport-client', (err, stats) => {
    if (err) {
      fs.mkdir('./uport-client', (err) => {
        if(err) reject(err)
        fs.writeFile(`./uport-client/index.json`, JSON.stringify({ identity: '', all:[] }), (err) => {
          if(err) reject(err)
          resolve()
        })
      })
    } else {
      resolve()
    }
  })
})

const writeSerializedIdentity = (name, serialized) => new Promise((resolve, reject) => {
  fs.writeFile(`./uport-client/${name}.json`, serialized, (err) => {
    if(err) reject(err)
    resolve()
  })
})

const writeSetIdentity = (name) => new Promise((resolve, reject) => {
  fs.readFile('./uport-client/index.json', 'utf8', (err, res) => {
    if (err) reject(err)
    const index = JSON.parse(res)
    index.identity = name
    const indexString = JSON.stringify(index)
    fs.writeFile('./uport-client/index.json', indexString, (err) => {
      if(err) reject(err)
      resolve()
    })
  })
})

const writeAddIdentity = (name) => new Promise((resolve, reject) => {
  fs.readFile('./uport-client/index.json', 'utf8', (err, res) => {
    if (err) reject(err)
    const index = JSON.parse(res)
    // TODO move this error to earlier
    if (index.all.includes(name)) reject("Can't create identity with same reference name")
    index.all.push(name)
    const indexString = JSON.stringify(index)
    fs.writeFile('./uport-client/index.json', indexString, (err) => {
      if(err) reject(err);
      resolve()
    })
  })
})

const writeFiles = (fileName, serialized) => {
  return initFiles()
    .then(res => writeSetIdentity(fileName))
    .then(res => writeAddIdentity(fileName))
    .then(res => writeSerializedIdentity(fileName, serialized))
    .catch(err => console.log('ERROR: ' + err))
}

// TODO use above as well
const readIndex = () => new Promise((resolve, reject) => {
  fs.readFile('./uport-client/index.json', 'utf8', (err, res) => {
    if (err) reject(err)
    resolve(res)
  })
})

// TODO clean up readability and code
program
  .command('identity [name]')
  .description('Initialize a new uPort identity')
  .action(function(name){
    if (!name) {
      readIndex().then(res => {
        res = JSON.parse(res)
        const names = res.all
        const id = res.identity
        names.forEach(e => {
          if (e === id) {
            console.log(`* ${e}`)
          } else {
            console.log(`  ${e}`)
          }
        })
      })
    } else {
      let sethuh
      readIndex().then(res => {
        res = JSON.parse(res)
        const names = res.all
        if (!!names.includes(name)) {
          sethuh = true
          return  writeSetIdentity(name)
        }
        // else { throw new Error('Not a valid identity')}
      }).then(res => {
        if (sethuh) {
          console.log(`Selected the identity ${name}`)
        } else {
          console.log('Invalid name')
        }
      })
    }
  })

program
  .command('consume <uri>')
  .description('Consume the message <uri> and process it')
  .action(function (uri) {
    // This function probably needs to display what you are
    // about to do and have a y/n type dialog before proceeding
    let identity
    readIndex().then(res => {
      res = JSON.parse(res)
      identity = res.identity
      return new Promise((resolve, reject) => {
        fs.readFile(`./uport-client/${identity}.json`, 'utf8', (err, res) => {
          if (err) reject(err)
          resolve(res)
        })
      })
    }).then(serializedClient => {
      uportClient = deserializeUportClient(serializedClient)
      return uportClient.consume(uri)
    }).then(res => {
      console.log(res)
      // Reserialize the state to update nonce etc
      // Not sure if this is the best way to go about this. (No will change)
      const serialized = serializeUportClient(uportClient)
      return writeSerializedIdentity(identity, serialized)
    }).then(res => {
      // ...
    })
})

// TODO more granular export
program
  .command('export [fileName]')
  .description('Export a serialized version of an identity')
  .action(function (fileName) {
    // TODO redundant code and process
    readIndex().then(res => {
      res = JSON.parse(res)
      identity = res.identity
      return new Promise((resolve, reject) => {
        fs.readFile(`./uport-client/${identity}.json`, 'utf8', (err, res) => {
          if (err) reject(err)
          resolve(res)
        })
      })
    }).then(serializedClient => {
      if (fileName) {
        return new Promise((resolve, reject) => {
          fs.writeFile(fileName, serializedClient, (err) => {
            if(err) reject(err)
            resolve()
          })
        })
      }

      process.stdout.write(serializedClient)
    }).then(res => {
      // ...
    })
})

// TODO MODIFY COMMANDS
// TODO Modify DDO - go through prompt again, with defaults available to keep or change
// TODO allow a more general interface in future to modify and write to DDO for any identity.
program
  .command('modify appDDO')
  .description('Modify DDO of an app identity')
  .action(function () {
      let uportClient
      // TODO Separate this func
      let identity
      readIndex().then(res => {
        res = JSON.parse(res)
        identity = res.identity
        return new Promise((resolve, reject) => {
          fs.readFile(`./uport-client/${identity}.json`, 'utf8', (err, res) => {
            if (err) reject(err)
            resolve(res)
          })
        })
      }).then(serializedClient => {
        uportClient = deserializeUportClient(serializedClient)
        return uportClient.getDDO()
      }).then(ddo => {
        const modifyPrompt  = [{
            type : 'list',
            name : 'key',
            choices: [
              `Name: ${ddo.name || 'No Value'}`,
              `Description: ${ddo.description || 'No Value'}`,
              `Url: ${ddo.url || 'No Value'}`,
              `Image: ${ddo.image || 'No Value'}`,
              'All: Change all values'
            ],
            message : 'Which value(s) do you want to change?'
          }]

          return recursiveDDOModify(modifyPrompt[0], ddo)
      }).then(ddo => {
        return uportClient.appDDO(ddo.name, ddo.description, ddo.url, ddo.image)
      }).then(ddo => {
        // TODO add confirmation prompt before writing the DDO
        return uportClient.writeDDO(ddo)
      }).then(res => {
        // res is txhash
        console.log('Updated DDO written and update completed.')
        return writeSerializedIdentity(identity, serialized)
      }).catch(console.log)
  })


const recursiveDDOModify = (prompt, ddo = {}) => {
  let continuePrompt = true
  let promptKey
  return inquirer.prompt(prompt).then(answers => {

    promptKey = answers.key.substring(0, answers.key.indexOf(':')).toLowerCase()
    const promptVal = answers.key.substring(answers.key.indexOf(': '))

    if (promptKey === 'none') {
      continuePrompt = false
      return ddo
    }

    if (['name', 'description', 'url'].includes(promptKey)) {
      // same prompt for all these
      const changePrompt = [{
         type : 'input',
         name : 'val',
         message : `Current Value: ${promptVal} \n  Enter your new value: `
       }]
      return inquirer.prompt(changePrompt)
    } else if(promptKey === 'image') {
        // messaging specicific to image url
        const changeImagePrompt = [{
           type : 'input',
           name : 'val',
           message : `Current Value: ${promptVal} \n  Enter new value as path to local file, it will be uploaded to ipfs: `
         }]

      return inquirer.prompt(changeImagePrompt)
    } else {
      // TODO build relevant all request
    }
  }).then(answers => {
    const obj = {}
    obj[promptKey] =  answers.val
    const newDDO = Object.assign(ddo, obj)
    prompt.choices.unshift('None: I am all done modifying values')
    // prompt.choices[prompt.choices.length - 1] = 'None: I am all done modifying values'
    if (continuePrompt) {
      return recursiveDDOModify(prompt, newDDO)
    } else {
      return newDDO
    }
  })
}

// TODO Modify Configs -
//  find the subset of configs which can be changed (and not changed)
//  interactively go through which ones can be chaged and offer default to keep or change.

program.parse(process.argv);
