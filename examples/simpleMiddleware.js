// import mcproxy, replace ".."
// with "@rob9315/mcproxy" in your project
const { Conn } = require('..');
const { createServer } = require('minecraft-protocol');

if (process.argv.length < 4 || process.argv.length > 6) {
  console.log('Usage : node simpleMiddleware.js <host> <port> [<email>] [<password>]');
  process.exit(1);
}

const conn = new Conn({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : 'proxyBot',
  password: process.argv[5] ? process.argv[5] : '',
  auth: process.argv[5] ? 'microsoft' : 'offline',
  version: '1.12.2',
});

conn.stateData.bot.once('spawn', () => {
  console.log('spawn');

  /** @type {import('../lib/index').PacketMiddleware} */
  const filterChatMiddleware = ({ isCanceled, meta }) => {
    if (isCanceled) return; // Not necessary but may improve performance when using multiple middleware's after each other
    if (meta.name !== 'chat') return; // Do nothing if the packet is not a chat packet
    if (data.message.includes('censor')) return false; // Cancel all packets that have the word censor in the chat message string
  };

  const ServerListenPort = 25566;

  const server = createServer({
    motd: 'mc proxy bot',
    'online-mode': false,
    port: ServerListenPort,
    version: '1.12.2',
  });

  server.on('login', (client) => {
    conn.sendPackets(client);

    conn.link(client, {
      toClientMiddleware: [filterChatMiddleware],
    });
  });

  server.on('listening', () => {
    console.info(`Server listening on port ${ServerListenPort}`);
  });

  conn.stateData.bot.once('end', () => {
    server.close();
  });
});

conn.stateData.bot.on('error', (err) => {
  console.error(err);
});
conn.stateData.bot.on('end', (reason) => {
  console.error(reason);
  process.exit(1);
});
