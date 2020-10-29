import * as conn from './index.js';
import mc from 'minecraft-protocol';
import mineflayer from 'mineflayer';

process.title = 'mcproxy-conn test';

export const server = mc.createServer({
  host: 'localhost',
  port: 25566,
  'online-mode': false,
});

export const botconn = new conn.Conn({
  username: 'whatABot', //! change when entering an 'online-mode' server
  //password: '', //! uncomment and change, you know
  host: 'localhost',
  port: 25565,
  plugins: {},
});

botconn.bot._client.on('packet', (data, packetMeta) => {
  if (packetMeta.name == 'chat' && data.message.includes('debug')) {
    console.log();
  }
});

server.on('login', (client) => {
  botconn.sendPackets(client);
  botconn.link(client);
});
