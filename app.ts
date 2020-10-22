import { readFileSync } from 'fs';
import * as mcproxy from './index.js';
const cred = JSON.parse(readFileSync('./cred.json', 'utf-8'));
const proxy = new mcproxy.Proxy('localhost', 25566);
proxy.rooms[0].addBotConn(
	new mcproxy.BotConn(
		new mcproxy.Address('localhost', 25565),
		new mcproxy.Account(cred.username, cred.password),
	),
);
(proxy.rooms[0].botConns[0] as mcproxy.BotConn).bot._client.on(
	'packet',
	(data, packetMeta) => {
		mcproxy.output(new Object(), data, packetMeta);
	},
);
