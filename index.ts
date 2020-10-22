import * as mc from 'minecraft-protocol';
import * as mineflayer from 'mineflayer';
import { loadWelcomeMap } from './loadWelcomeMap';

export class Address {
	host: string;
	port: number;
	constructor(host: string, port: number) {
		this.host = host;
		this.port = port;
	}
}
export class Account {
	username: string;
	password: string;
	constructor(username: string, password: string) {
		this.username = username;
		this.password = password;
	}
}
export class User {
	proxyClient: mc.Client;
	constructor(proxyClient: mc.Client) {
		this.proxyClient = proxyClient;
		loadWelcomeMap(this.proxyClient);
		this.proxyClient.on('packet', (data, packetMeta) => {
			output(this, data, packetMeta);
		});
	}
}
export class BotConn {
	address: Address;
	account: Account;
	constructor(address: Address, account: Account) {
		this.address = address;
		this.account = account;
	}
}
export class Room {
	users: User[];
	botConns: BotConn[];
	roomID: number;
	roomPassword: string;
	constructor(roomID: number, roomPassword: string) {
		this.roomID = roomID;
		this.roomPassword = roomPassword;
		this.users = [];
		this.botConns = [];
	}
	addUser(user: User) {
		if (this.roomPassword == null) {
		}
	}
	linkUser(user: User, botConn: BotConn) {}
}
export class Proxy {
	rooms: Room[];
	users: User[];
	botConns: BotConn[];
	host: string;
	port: number;
	proxyServer: mc.Server;
	serverOptions: mc.ServerOptions;
	constructor(host: string, port: number, serverOptions: mc.ServerOptions) {
		this.host = host;
		this.port = port;
		this.serverOptions = serverOptions;
		this.rooms = [];
		this.rooms[0] = new Room(0, '');
		this.proxyServer = mc.createServer(serverOptions);
		this.users = [];
		this.botConns = [];

		this.proxyServer.on('login', (proxyClient) => {
			let user = new User(proxyClient);
			users.push(user);
			this.rooms[0].addUser(user);
		});
	}
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

function output(object: any, data: any, packetMeta: mc.PacketMeta) {
	if (object.name) {
		console.log(object.name, packetMeta.name, packetMeta.state, data);
	} else {
		console.log(packetMeta.name, packetMeta.state, data);
	}
}
