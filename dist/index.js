import mc from 'minecraft-protocol';
import mineflayer from 'mineflayer';
import { loadWelcomeMap } from './loadWelcomeMap.js';
var Address = /** @class */ (function () {
    function Address(host, port) {
        this.host = host;
        this.port = port;
    }
    return Address;
}());
export { Address };
var Account = /** @class */ (function () {
    function Account(username, password) {
        this.username = username;
        if (password)
            this.password = password;
    }
    return Account;
}());
export { Account };
var User = /** @class */ (function () {
    function User(proxyClient) {
        var _this = this;
        this.proxyClient = proxyClient;
        loadWelcomeMap(this.proxyClient);
        this.proxyClient.on('packet', function (data, packetMeta) {
            if (packetMeta.name == 'player_info') {
                console.log('');
            }
            output(_this, data, packetMeta);
        });
    }
    return User;
}());
export { User };
var BotConn = /** @class */ (function () {
    function BotConn(address, account) {
        this.address = address;
        this.account = account;
        this.bot = mineflayer.createBot({
            username: account.username,
            password: account.password,
            host: address.host,
            port: address.port,
            version: '1.12.2',
        });
        this.client = this.bot._client;
    }
    return BotConn;
}());
export { BotConn };
var Room = /** @class */ (function () {
    function Room(roomID, roomPassword) {
        this.roomID = roomID;
        this.roomPassword = roomPassword;
        this.users = [];
        this.botConns = [];
    }
    Room.prototype.addUser = function (user) {
        if (!(this.roomPassword == null)) {
        }
        else {
            this.users.push(user);
        }
    };
    Room.prototype.addBotConn = function (botConn) {
        this.botConns.push(botConn);
    };
    Room.prototype.linkUser = function (user, botConn) { };
    return Room;
}());
export { Room };
var Proxy = /** @class */ (function () {
    function Proxy(host, port) {
        var _this = this;
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
        this.proxyServer.on('login', function (proxyClient) {
            var user = new User(proxyClient);
            _this.users.push(user);
            _this.rooms[0].addUser(user);
        });
    }
    return Proxy;
}());
export { Proxy };
export function output(object, data, packetMeta) {
    //!debug
    if (!(packetMeta.name == 'keep_alive') && true) {
        if (!(packetMeta.name == 'map_chunk')) {
            console.log(packetMeta.state, packetMeta.name, data);
        }
    }
    if (packetMeta.name == 'chat' &&
        data.message.includes('debugpls')) {
        console.log();
    }
}
//# sourceMappingURL=index.js.map