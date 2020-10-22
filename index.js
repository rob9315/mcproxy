"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Proxy = exports.Room = exports.BotConn = exports.User = exports.Account = exports.Address = void 0;
var mc = __importStar(require("minecraft-protocol"));
var Address = /** @class */ (function () {
    function Address(host, port) {
        this.host = host;
        this.port = port;
    }
    return Address;
}());
exports.Address = Address;
var Account = /** @class */ (function () {
    function Account(username, password) {
        this.username = username;
        this.password = password;
    }
    return Account;
}());
exports.Account = Account;
var User = /** @class */ (function () {
    function User(proxyClient) {
        this.proxyClient = proxyClient;
    }
    return User;
}());
exports.User = User;
var BotConn = /** @class */ (function () {
    function BotConn(address, account) {
        this.address = address;
        this.account = account;
    }
    return BotConn;
}());
exports.BotConn = BotConn;
var Room = /** @class */ (function () {
    function Room(roomID, roomPassword) {
        this.roomID = roomID;
        this.roomPassword = roomPassword;
        this.users = [];
        this.botConns = [];
    }
    Room.prototype.addUser = function (user) {
        if (this.roomPassword == null) {
        }
    };
    Room.prototype.linkUser = function (user, botConn) { };
    return Room;
}());
exports.Room = Room;
var Proxy = /** @class */ (function () {
    function Proxy(host, port, serverOptions) {
        var _this = this;
        this.host = host;
        this.port = port;
        this.serverOptions = serverOptions;
        this.rooms = [];
        this.rooms[0] = new Room(0, '');
        this.proxyServer = mc.createServer(serverOptions);
        this.users = [];
        this.botConns = [];
        this.proxyServer.on('login', function (proxyClient) {
            var user = new User(proxyClient);
            users.push(user);
            _this.rooms[0].addUser(user);
        });
    }
    return Proxy;
}());
exports.Proxy = Proxy;
var users = [];
var proxyServer = mc.createServer({
    host: 'localhost',
    port: 25566,
    'online-mode': false,
    motd: 'THE redirection tool mcproxy by Rob9315 (more or less)',
});
proxyServer.on('login', function (proxyClient) {
    users.push(new User(proxyClient));
});
