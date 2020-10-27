import * as conn from './index.js';
import mc from 'minecraft-protocol';
process.title = 'mcproxy-conn test';
export const server = mc.createServer({
    host: 'localhost',
    port: 25566,
    'online-mode': false,
});
export const botconn = new conn.Conn({
    username: 'consistetBot',
    // password: 'apassword', //! uncomment and change, you know
    host: 'localhost',
    port: 25565,
    plugins: {},
});
botconn.bot._client.on('packet', (data, packetMeta) => {
    if (packetMeta.name == 'chat' && data.message.includes('debug')) {
        console.log();
    }
    if (!['keep_alive', 'update_time'].includes(packetMeta.name) && true) {
        console.log('tobot', packetMeta.state, packetMeta.name, data);
    }
});
server.on('login', (client) => {
    botconn.sendPackets(client);
    botconn.link(client);
});
//# sourceMappingURL=app.js.map