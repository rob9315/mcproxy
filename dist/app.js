import { readFileSync } from 'fs';
import * as mcproxy from './index.js';
import readline from 'readline';
import { genLogin } from './genLogin.js';
var cred = JSON.parse(readFileSync('./cred.json', 'utf-8'));
export var proxy = new mcproxy.Proxy('localhost', 25566);
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
proxy.rooms[0].addBotConn(new mcproxy.BotConn(new mcproxy.Address('localhost', 25565), new mcproxy.Account(cred.username, cred.password)));
proxy.rooms[0].botConns[0].bot._client.on('packet', function (data, packetMeta) {
    mcproxy.output(new Object(), data, packetMeta);
});
proxy.rooms[0].botConns[0].bot._client.on('packet', function (data, packetMeta) {
    if (packetMeta.name == 'chat' &&
        data.message.includes('debugpls')) {
        genLogin(proxy.rooms[0].botConns[0].bot, proxy.users[0].proxyClient);
        console.log();
    }
});
//# sourceMappingURL=app.js.map