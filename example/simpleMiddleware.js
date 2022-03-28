const { Conn } = require('../lib/index')
const { createServer } = require('minecraft-protocol')
const wait = require('util').promisify(setTimeout)

if (process.argv.length < 4 || process.argv.length > 6) {
  console.log('Usage : node simpleMiddleware.js <host> <port> [<name>] [<password>]')
  process.exit(1)
}

const conn = new Conn({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : 'proxyBot',
  password: process.argv[5]
})

conn.bot.once('spawn', () => {
  /** Middleware for server bound packets */
  /** @type {import('../lib/index').PacketMiddleware} */
  const fakePingMiddleware = async (_info, _pclient, _data, cancel) => {
    if (cancel.isCanceled) return
    await wait(500)
  }

  /** @type {import('../lib/index').PacketMiddleware} */
  const filterChatMiddleware = (info, _pclient, data, cancel) => {
    if (cancel.isCanceled) return // Not necessary but may improve performance when using multiple middleware's after each other
    if (info.meta.name !== 'chat') return
    if (JSON.stringify(data.message).includes('censor')) return cancel() // Cancel all packets that have the word censor in the chat message string
  }

  const server = createServer({
    motd: 'mc proxy bot',
    'online-mode': false,
    port: 25567,
    version: '1.12.2'
  })

  conn.bot.once('end', () => {
    server.close()
  })

  server.on('login', (client) => {
    conn.sendPackets(client)
    
    conn.link(client, {
      toClientMiddleware: [filterChatMiddleware],
      toServerMiddleware: [fakePingMiddleware]
    })
  })
})