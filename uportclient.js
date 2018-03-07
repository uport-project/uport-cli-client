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
    fileExist(`./uport-client/index.json`).then(exist => {
      if (exist) {
        readIndex().then(res => {
          const names = res.all
          if (names.includes(fileName)) {
            let deploy, client
            return readIdentity(fileName)
                      .then(json => deserializeUportClient(json))
                      .then(res => {
                        client = res
                        if(client.initialized) {
                          throw new Error("Can't create identity with same reference name")
                        } else {
                          return readDeploy(fileName)
                        }
                      }).then(bool => {
                        deploy = bool
                        return readLocalDDO(fileName)
                      }).then(appDDO => {
                        console.log('Identity already configured but was not initialized, try intializing again:')
                        return initFlow({deploy, appDDO}, client)
                      })
          } else {
            return startCreate()
          }
        })
      } else {
        return startCreate()
      }
    })

    const startCreate = ()  => new Promise((resolve, reject) => {
      // Create config object
      let config = { network: {}}
      let uportClient
      return inquirer.prompt(txt.network).then(answers => {
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
          return writeLocalDDO(fileName, config.appDDO)
        })
      }).then(res => {
        config.deviceKeys = genKeyPair()
        uportClient = new UPortClient(config)
        let serialized = serializeUportClient(uportClient)
        return writeFiles(fileName, serialized)
      }).then(res => {
        if (config.deploy) return writeDeploy(fileName, true)
        return
      }).then(res => {
        return initFlow(config, uportClient)
      })
    })


    // TODO cleanup
    const initFlow = (config, uportClient) => new Promise((resolve, reject) => {
      // TODO give estimates for amount necessary for each creation below
      if (config.deploy === true ) {
        console.log(`\n Please fund the following address: \n\n ${uportClient.deviceKeys.address} \n\n Then the contracts can be deployed and identity created \n`)
      } else {
        console.log(`\n Please fund the following address: \n\n ${uportClient.deviceKeys.address} \n\n Then your identity can be created \n`)
      }
      return inquirer.prompt(txt.fundContinue).then(res => {
        if (!config.deploy) return
        console.log('\n Deploying uPort platform contracts...')
        return deploy(uportClient.network.rpcUrl, {from: uportClient.deviceKeys.address}, uportClient.deviceKeys.privateKey).then(res => {
          uportClient.network.registry =  res.Registry
          uportClient.network.identityManager  = res.IdentityManager
          uportClient.identityManagerAddress = res.IdentityManager
          uportClient.registryAddress = res.Registry
          uportClient.nonce = 2  // TODO better nonce management in client
          uportClient.initTransactionSigner(uportClient.identityManagerAddress)
          console.log(`\n uPort registry contract configured and deployed at ${uportClient.network.registry} \n\n uPort Identity Manager contract configured and deployed at ${uportClient.network.identityManager} \n`)
          return writeDeploy(fileName, false)
        }).then(res => {
          let serialized = serializeUportClient(uportClient)
          return writeFiles(fileName, serialized)
        })
      }).then(res => {
        console.log('Initializing identity... \n')
        if (!config.appDDO) return
        return uportClient.appDDO(config.appDDO.name, config.appDDO.description, config.appDDO.url, config.appDDO.imgPath)
      }).then(appDDO => {
        if (appDDO) return uportClient.initializeIdentity(appDDO)
        return uportClient.initializeIdentity()
      }).then(res => {
        console.log(' \n uPort Identity Creeated! \n')
        // TODO pretty print the identity
        console.log(uportClient)

        let serialized = serializeUportClient(uportClient)
        console.log('\n Saving client')

        return writeFiles(fileName, serialized)
      }).then(res => {
        console.log('All Done!')
        return writeLocalDDO(fileName, {})
      })
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
        if (names.includes(name)) {
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

const initFiles = () => fileExist('./uport-client').then(exist => {
  return new Promise((resolve, reject) => {
    if (!exist) {
      fs.mkdir('./uport-client', (err) => {
        if(err) reject(err)
        fs.writeFile(`./uport-client/index.json`, JSON.stringify({ identity: '', all:[], deploy: {}, ddo: {} }), (err) => {
          if(err) reject(err)
          resolve()
        })
      })
    } else {
      resolve()
    }
  })
})

const fileExist = (path) => new Promise((resolve, reject) => {
  fs.lstat(path, (err, stats) => {
    if (err) resolve(false)
    resolve(true)
  })
})

const writeSerializedIdentity = (name, serialized) => new Promise((resolve, reject) => {
  fs.writeFile(`./uport-client/${name}.json`, serialized, (err) => {
    if(err) reject(err)
    resolve()
  })
})

const writeDeploy = (name, bool) => {
  return readIndex().then(index => {
    if (bool) index.deploy[name] = bool
    if (!bool) delete index.deploy[name]
    return writeIndex(index)
  })
}

const readDeploy = (name) => {
  return readIndex().then(index =>  index.deploy[name] ? true : false )
}

const writeLocalDDO = (name, ddo) => {
  return readIndex().then(index => {
    if (ddo === {}) {
      delete index.ddo[name]
    } else {
      index.ddo[name] = ddo
    }
    return writeIndex(index)
  })
}

const readLocalDDO =  (name) => {
  return readIndex().then(index => {
    if (index.ddo[name]) return index.ddo[name]
    return {}
  })
}

const writeSetIdentity = (name) => {
  return readIndex().then(index => {
      index.identity = name
      return writeIndex(index)
  })
}

const writeAddIdentity = (name) => {
  return readIndex().then(index => {
      index.all.push(name)
      return writeIndex(index)
  })
}

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

const writeIndex = (obj) => new Promise((resolve, reject) => {
  fs.writeFile('./uport-client/index.json', JSON.stringify(obj), (err) => {
    if(err) reject(err);
    resolve()
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
