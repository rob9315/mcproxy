import * as mcproxy from './index.js';
let test = new mcproxy.ProxyServer({
    'online-mode': true,
    host: 'localhost',
    port: 25566,
});
test.server.on('login', () => {
    console.log('test');
});
//# sourceMappingURL=app.js.map