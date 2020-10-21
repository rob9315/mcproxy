import mc from 'minecraft-protocol';
import mineflayer from 'mineflayer';
import { loadWelcomeMap } from './loadWelcomeMap.js';

let badpackets = [];

export class User {
  constructor(){}
  conn(proxyClient) {
    switch (true) {
      
      default:
        break;
    }
    this.proxyClient = proxyClient;
		proxyClient.on('packet', (data, packetMeta) => {
			console.log('PACKET', packetMeta.name, data);
		});
		proxyClient.on('end', (reason) => {
      console.log('END', reason);
      delete proxyClient
		});
		loadWelcomeMap(proxyClient);
	}
	static send({ data, packetMeta }, sender) {
		if (!badpackets.includes(packetMeta.name)) {
			sender.write(packetMeta.name, data);
		}
	}
}

export class BotConn{
  constructor(host, port, username, password)
}

let users = [];

let proxyServer = mc.createServer({
	host: 'localhost',
	port: 25566,
	'online-mode': false,
	motd: 'THE redirection tool mcproxy by Rob9315 (more or less)',
});

proxyServer.on('login', (proxyClient) => {
	users.push(new User(proxyClient));
});
