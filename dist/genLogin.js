export function genLogin(bot, client) {
    client.on('packet', function (data, packetMeta) {
        console.log('client', packetMeta.name, data);
    });
    send({
        data: {
            entityId: bot.entity.id,
            gameMode: bot.player.gamemode,
            dimension: bot.game.dimension,
            difficulty: bot.game.difficulty,
            maxPlayers: bot.game.maxPlayers,
            levelType: bot.game.levelType,
            reducedDebugInfo: false,
        },
        meta: { name: 'login' },
    }, client);
    var columnArray = bot.world.getColumns();
    for (var index in columnArray) {
        if (Object.prototype.hasOwnProperty.call(columnArray, index)) {
            var chunk = columnArray[index];
            send(buildChunkPacket({
                x: chunk.chunkX,
                z: chunk.chunkZ,
                chunk: chunk.column,
            }), client);
        }
    }
    for (var index in bot.entities) {
        if (Object.prototype.hasOwnProperty.call(bot.entities, index)) {
            var entity = bot.entities[index];
            sendEntity(entity, client);
        }
    }
    bot._client.on('packet', function (data, packetMeta) {
        if (packetMeta.name != 'keep_alive') {
            client.write(packetMeta.name, data);
        }
    });
    client.on('packet', function (data, packetMeta) {
        if (packetMeta.name != 'keep_alive') {
            bot._client.write(packetMeta.name, data);
        }
    });
    //       default:
    //         break;
    //     }
    //   });
}
function buildChunkPacket(_a) {
    var x = _a.x, z = _a.z, chunk = _a.chunk;
    var meta = { name: 'map_chunk' };
    var data = {
        x: x,
        z: z,
        groundUp: true,
        bitMap: chunk.getMask(),
        chunkData: chunk.dump(),
        blockEntities: [],
    };
    return { data: data, meta: meta };
}
function send(_a, sender) {
    var data = _a.data, meta = _a.meta;
    if (!['keep_alive', ''].includes(meta.name)) {
        console.log(meta.name, data);
        sender.write(meta.name, data);
    }
}
//* hP stands for hasProperty
function hP(object, keys) {
    keys.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
            return false;
        }
    });
    return true;
}
function sendEntity(entity, sender) {
    switch (entity.type) {
        case 'player':
            send({
                data: {
                    entityId: entity.id,
                    playerUUID: entity.uuid,
                    x: entity.position.x,
                    y: entity.position.y,
                    z: entity.position.z,
                    yaw: entity.yaw,
                    pitch: entity.pitch,
                    metadata: entity.metadata,
                },
                meta: { name: 'named_entity_spawn' },
            }, sender);
            break;
        case 'mob':
            send({
                data: {
                    entityId: entity.id,
                },
                meta: { name: '' },
            }, sender);
            break;
        case 'orb':
            send({
                data: {
                    entityId: entity.id,
                    x: entity.position.x,
                    y: entity.position.y,
                    z: entity.position.z,
                    count: entity.count,
                },
                meta: { name: 'spawn_entity_experience_orb' },
            }, sender);
            break;
        case 'global':
            send({
                data: {
                    entityId: entity.id,
                },
                meta: { name: '' },
            }, sender);
            break;
    }
}
//! SENDING A MESSAGE
// proxyClient.write("chat", {message: '{"translate":"chat.type.announcement","with":[{"text":"Server"},{"extra":[{"text":"hi"}],"text":""}]}'})
//# sourceMappingURL=genLogin.js.map