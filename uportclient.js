
const UPortClient = require("uport-mock-client").UPortClient
const serializeUportClient = require("uport-mock-client").serialize
const deserializeUportClient = require("uport-mock-client").deserialize
const program = require("commander")
const Promise = require("bluebird")
const keypress = require("keypress")

const fs = require("fs")

let uportClient

program
  .command('create <fileName>')
  .description('Create a new uPort client identity and save it to <fileName>.')
  .action(function (fileName) {

    // make `process.stdin` begin emitting "keypress" events
    keypress(process.stdin);

    const netconfigStr = fs.readFileSync(program.netconfig, 'utf8')
    const netconfig = JSON.parse(netconfigStr)[program.netid]

    const config = { network: { id: program.netid, rpcUrl : netconfig.rpcUrl, registry: netconfig.registry, identityManager: netconfig.identityManager} }
    uportClient = new UPortClient(config)
    uportClient.initKeys()
    console.log("Please send ETH to the following address:")
    console.log("")
    console.log(uportClient.deviceKeys.address)
    console.log("")
    console.log("Once sent and confirmed, press any key to continue.")
    // listen for the "keypress" event
    process.stdin.on('keypress', function (ch, key) {
      console.log('Initializing identity...')
      process.stdin.pause();
      uportClient.initializeIdentity().then(res => {
        let serialized = serializeUportClient(uportClient)
        console.log(serialized)
        console.log('Saving client to file ' + fileName + '.');
        fs.writeFileSync(fileName, serialized)
      })
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
