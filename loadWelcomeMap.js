"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadWelcomeMap = void 0;
function loadWelcomeMap(proxyClient) {
    // proxyClient.write('success', {
    // 	uuid: proxyClient.uuid,
    // 	username: proxyClient.username,
    // });
    proxyClient.write('login', {
        entityId: 1,
        gameMode: 1,
        dimension: 1,
        difficulty: 1,
        maxPlayers: 0,
        levelType: 'default',
        reducedDebugInfo: false,
    });
    proxyClient.write('position', {
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
        pitch: 0,
        flags: 0,
        teleportId: 1,
    });
    // proxyClient.write('held_item_slot', { slot: 4 });
    // proxyClient.write('chat', { message: 'hello there', position: 1 });
    // proxyClient.write('chat', { message: 'obi wan kenobi', position: 2 });
}
exports.loadWelcomeMap = loadWelcomeMap;
