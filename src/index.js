import mc from 'minecraft-protocol';
import mineflayer from 'mineflayer';
import { loadWelcomeMap } from './loadWelcomeMap.js';
export class Address {
    constructor(host, port) {
        this.host = host;
        this.port = port;
    }
}
export class Account {
    constructor(username, password) {
        this.username = username;
        this.password = password;
    }
}
export class User {
    constructor(proxyClient) {
        this.proxyClient = proxyClient;
        loadWelcomeMap(this.proxyClient);
        this.proxyClient.on('packet', (data, packetMeta) => {
            output(this, data, packetMeta);
        });
    }
}
export class BotConn {
    constructor(address, account) {
        this.address = address;
        this.account = account;
        this.bot = mineflayer.createBot({
            username: account.username,
            password: account.password,
            host: address.host,
            port: address.port,
        });
        this.client = this.bot._client;
    }
}
export class Room {
    constructor(roomID, roomPassword) {
        this.roomID = roomID;
        this.roomPassword = roomPassword;
        this.users = [];
        this.botConns = [];
    }
    addUser(user) {
        if (!(this.roomPassword == null)) {
        }
        else {
            this.users.push(user);
        }
    }
    addBotConn(botConn) {
        this.botConns.push(botConn);
    }
    linkUser(user, botConn) { }
}
export class Proxy {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.serverOptions = {
            host: host,
            port: port,
            'online-mode': false,
            motd: 'A redirection tool, mcproxy by Rob9315',
        };
        this.rooms = [];
        this.rooms[0] = new Room(0, '');
        this.proxyServer = mc.createServer(this.serverOptions);
        this.users = [];
        this.botConns = [];
        this.proxyServer.on('login', (proxyClient) => {
            let user = new User(proxyClient);
            this.users.push(user);
            this.rooms[0].addUser(user);
        });
    }
}
export function output(object, data, packetMeta) {
    //!debug
    if (!(packetMeta.name == 'keep_alive') && false) {
        if (object.name) {
            console.log(object.name, packetMeta.state, packetMeta.name, data);
        }
        else {
            console.log(typeof object, packetMeta.state, packetMeta.name, data);
        }
    }
    if (packetMeta.name == 'chat' &&
        data.message.includes('debugpls')) {
        console.log();
    }
}
