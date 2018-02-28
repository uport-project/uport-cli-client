#!/usr/bin/env node
const UPortClient = require("uport-client").UPortClient
const serializeUportClient = require("uport-client").serialize
const deserializeUportClient = require("uport-client").deserialize
const genKeyPair = require("uport-client").genKeyPair
const program = require("commander")
const inquirer = require('inquirer');
const deploy = require("uport-client").deploy
const fs = require("fs")
const txt = require('./txt.js')
const ipfsUrl = 'https://ipfs.infura.io/ipfs/'

/**
*
*  CREATE
*
*/

program
  .command('create <fileName>')
  .description('Create a new uPort client identity and save it to <fileName>.')
  .action((fileName) => {
    // Create config object
    let config = { network: {}}

    inquirer.prompt(txt.network).then(answers => {
        if (answers.networkid === 'Custom Network') {
          inquirer.prompt(txt.networkDeploy).then(answers => {
            if (answers.deployConfirm === true) config.deploy = true
            return inquirer.prompt(txt.networkConfigRPC)
          }).then(answers => {
            config.network.rpcUrl = answers.rpcUrl
            return inquirer.prompt(txt.ipfsConfirm)
          })
        }

        const net = txt.networks[answers.networkid]
        // TODO pretty print
        console.log(`\nYou selected ${answers.networkid}, the following is the default configuration: \n\n ${JSON.stringify(net, null, 4)}\n`)

        // Overwritten with non defaults
        config.network = net

        return inquirer.prompt(txt.networkConfirm).then(answers => {
          if (answers.netConfirm === false) {

            console.log(`\n The following is the default ipfs configuration: \n \n ipfsUrl = ${ipfsUrl}\n`)
            return inquirer.prompt(txt.ipfsConfirm)
          }
          return inquirer.prompt(txt.networkDeploy).then(answers => {
            if (answers.deployConfirm === true) {
              config.deploy = true
              return inquirer.prompt(txt.networkConfigRPC)
            }
          }).then(answers => {
            config.network.rpcUrl = answers.rpcUrl
            console.log(`\n The following is the default ipfs configuration: \n  \n ipfsUrl = ${ipfsUrl}\n`)
            return inquirer.prompt(txt.ipfsConfirm)
          })
        })
    }).then(answers => {
      if (answers.ipfsConfirm === true){
        config.ipfsConfig = ipfsUrl
        return inquirer.prompt(txt.appConfirm)
      }
      return inquirer.prompt(txt.ipfsConfig).then(answers => {
        config.ipfsConfig = answers.ipfsUrl
        return inquirer.prompt(txt.appConfirm)
      })
    }).then(answers => {
      if (answers.appConfirm === false) {
        return
      }
      return inquirer.prompt(txt.appConfig).then(answers => {
        config.appDDO = answers
        // TODO handle DDO Configuration
      })
    }).then(res => {
      config.deviceKeys = genKeyPair()

      // TODO give estimates for amount necessary for each creation below
      if (config.deploy === true ) {
        console.log(`\n Please fund the following address: \n\n ${config.deviceKeys.address} \n\n Then the contracts can be deployed and identity created \n`)
      } else {
        console.log(`\n Please fund the following address: \n\n ${config.deviceKeys.address} \n\n Then your identity can be created \n`)
      }
      return inquirer.prompt(txt.fundContinue)
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

/**
*
*  IDENTITY
*
*/

program
  .command('identity [name]')
  .description('List all identities or pass a name to select another identity')
  .action( name => {
    if (!name) {
      readIndex().then(index => {
        const list = index.all.map(i => i === index.identity ? `* ${i}` : `  ${i}`)
                              .reduce((acc, i) => `${acc} \n${i}`)
        console.log(list)
      })
    } else {
      let sethuh
      readIndex().then(res => {
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

/**
*
*  CONSUME
*
*/

program
  .command('consume <uri>')
  .description('Consume the message <uri> and process it')
  .action((uri) => {
    // TODO confirm dialog before write
    // TODO how to get identity name, without multiple file writes
      let identity
    return getSelectedIdentity()
      .then(uportClient => uportClient.consume(uri))
      .then(res => {
        console.log(res)
        // Reserialize the state to update nonce etc
        // Not sure if this is the best way to go about this. (No will change)
        const serialized = serializeUportClient(uportClient)
        return writeSerializedIdentity(identity, serialized)
      }).then(res => {
        // ...
      })
  })

/**
*
*  EXPORT
*
*/

program
  .command('export [fileName]')
  .description('Export a serialized version of an identity')
  .action(function (fileName) {
    getSelectedIdentity().then(client => {
      const serializedClient = serializeUportClient(client)
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
      // .../
    })
})

/**
*
*  MODIFY
*
*/

program
  .command('modify [type]')
  .description('Modify DDO of an app identity or Modify config of an app identity')
  .action(function (type) {
     if (type === 'appDDO') return modifyAppDDO()
     if (type === 'config') return modifyConfig()
     console.log('Not a valid modify type')
  })

// TODO add confirmation prompt before writing the DDO
const modifyAppDDO = () => {
    let uportClient
    // TODO need to get the name of it
    let identity
    getSelectedIdentity().then(client => {
      uportClient = client
      return uportClient.getDDO()
    }).then(ddo => recursiveModify(txt.modifyDDOPrompt(ddo), ddo))
      .then(ddo => uportClient.appDDO(ddo.name, ddo.description, ddo.url, ddo.image))
      .then(ddo => uportClient.writeDDO(ddo))
      .then(res => {
      // res is txhash
      console.log('Updated DDO written and update completed.')
      const serialized = serializeUportClient(uportClient)
      return writeSerializedIdentity(identity, serialized)
    }).catch(console.log)
}

const modifyConfig = () => {
  let uportClient, identity
  getSelectedIdentity().then(client => {
    uportClient = client
    const config = {
      rpcUrl: uportClient.network.rpcUrl,
      ipfsUrl: uportClient.ipfsUrl
    }
    return recursiveModify(txt.modifyConfigPrompt(config), config)
 }).then(config => {
   uportClient.network.rpcUrl = config.rpcUrl
   uportClient.ipfsUrl = config.ipfsUrl
   console.log('Updated config written and update completed.')
   const serialized = serializeUportClient(uportClient)
   return writeSerializedIdentity(identity, serialized)
 }).catch(console.log)
}

const recursiveModify = (prompt, obj= {}) => {
  let continuePrompt = true
  let promptKey
  return inquirer.prompt(prompt).then(answers => {
    promptKey = answers.key.substring(0, answers.key.indexOf(':')).toLowerCase()
    const promptVal = answers.key.substring(answers.key.indexOf(': '))

    if (promptKey === 'none') {
      continuePrompt = false
      return obj
    }

    if (promptKey === 'image') return inquirer.prompt(txt.changeImagePrompt(promptVal))
    return inquirer.prompt(txt.changePrompt(promptVal))
  }).then(answers => {
    const newVal = {}
    newVal[promptKey] =  answers.val
    const newObj = Object.assign(obj, newVal)
    const none = 'None: I am all done modifying values'
    if (prompt.choices[0] !== none) prompt.choices.unshift(none)
    if (continuePrompt) return recursiveModify(prompt, newObj)
    return newObj
  })
}

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

const readIndex = () => new Promise((resolve, reject) => {
  fs.readFile('./uport-client/index.json', 'utf8', (err, res) => {
    if (err) reject(err)
    resolve(JSON.parse(res))
  })
})

const getSelectedIdentity = () => {
  return readIndex()
          .then(index => readIdentity(index.identity))
          .then(json => deserializeUportClient(json))
}

const readIdentity = (name) => new Promise((resolve, reject) => {
  fs.readFile(`./uport-client/${name}.json`, 'utf8', (err, res) => {
    if (err) reject(err)
    resolve(res)
  })
})

program.parse(process.argv);
