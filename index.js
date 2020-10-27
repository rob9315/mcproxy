import mineflayer from 'mineflayer';
import { botconn } from './app.js';
// export class simpleProxy {
//   client: mc.Client;
//   proxyServer: mc.Server;
//   selectedProxyClient: mc.Client;
//   constructor(
//     pServerOptions: mc.ServerOptions,
//     clientOptions: mc.ClientOptions,
//   ) {
//     this.client = new mc.Client(false, '');
//     this.selectedProxyClient = new mc.Client(true, '');
//     this.proxyServer = mc.createServer(pServerOptions);
//     this.proxyServer.once('login', (proxyClient) => {
//       this.selectedProxyClient = proxyClient;
//       this.client = mc.createClient(clientOptions);
//       this.client.on('packet', (data, packetMeta) => {
//         for (const key in this.proxyServer.clients) {
//           if (
//             Object.prototype.hasOwnProperty.call(this.proxyServer.clients, key)
//           ) {
//             const proxyClient = this.proxyServer.clients[key];
//             proxyClient.write(packetMeta.name, data);
//           }
//         }
//       });
//       this.selectedProxyClient.on('packet', (data, packetMeta) => {
//         this.client.write(packetMeta.name, data);
//       });
//     });
//   }
//   getProxyClients() {
//     return this.proxyServer.clients;
//   }
// }
export class Conn {
    constructor(botOptions) {
        this.write = (name, data) => { };
        this.writeRaw = (buffer) => { };
        this.writeChannel = (channel, params) => { };
        this.packetlog = [];
        this.bot = mineflayer.createBot(botOptions);
        this.write = this.bot._client.write.bind(this.bot._client);
        this.writeRaw = this.bot._client.writeRaw.bind(this.bot._client);
        this.writeChannel = this.bot._client.writeChannel.bind(this.bot._client);
        this.metadata = [];
        this.bot._client.on('packet', (data, packetMeta) => {
            if (this.pclient) {
                this.pclient.write(packetMeta.name, data);
            }
            if (!['keep_alive', 'update_time'].includes(packetMeta.name) && true) {
                this.packetlog.push({
                    name: packetMeta.name,
                    data: data,
                    state: packetMeta.state,
                });
            }
        });
        //* entity metadata tracking
        this.bot._client.on('packet', (data, packetMeta) => {
            if (Object.prototype.hasOwnProperty.call(data, 'metadata') &&
                Object.prototype.hasOwnProperty.call(data, 'entityId') &&
                this.bot.entities[data.entityId]) {
                this.metadata[data.entityId] = data.metadata;
            }
        });
    }
    sendPackets(pclient) {
        let packets = this.generatePackets();
        packets.forEach(({ data, name }) => {
            if ((name != 'map_chunk' || false) && false) {
                console.log('topclient', 'STATE', name, data);
            }
            pclient.write(name, data);
        });
    }
    generatePackets() {
        let bot = botconn.bot;
        let packets = [];
        //* login
        packets.push({
            name: 'login',
            data: {
                entityId: bot.entity.id,
                gameMode: bot.game.gameMode,
                dimension: bot.game.dimension,
                difficulty: bot.game.difficulty,
                maxPlayers: bot.game.maxPlayers,
                levelType: bot.game.levelType,
                reducedDebugInfo: false,
            },
        });
        //* game_state_change
        //* sets the gamemode
        packets.push({
            name: 'game_state_change',
            data: {
                reason: 3,
                gameMode: bot.player.gamemode,
            },
        });
        //* player_info (personal)
        //* the players player_info packet
        packets.push({
            name: 'player_info',
            data: {
                action: 0,
                data: [
                    {
                        UUID: bot.player.uuid,
                        name: bot.username,
                        properties: [],
                        gamemode: bot.player.gamemode,
                        ping: bot.player.ping,
                        displayName: undefined,
                    },
                ],
            },
        });
        //* player_info
        for (const name in bot.players) {
            if (Object.prototype.hasOwnProperty.call(bot.players, name)) {
                const player = bot.players[name];
                if (player.uuid != bot.player.uuid) {
                    packets.push({
                        name: 'player_info',
                        data: {
                            action: 0,
                            data: [
                                {
                                    UUID: player.uuid,
                                    name: player.username,
                                    properties: [
                                    // { //! disabled currently, if even able to generate these strings
                                    //   name: "textures",
                                    //   signature:
                                    //     "",
                                    //   value:
                                    //     "",
                                    // },
                                    ],
                                    gamemode: player.gamemode,
                                    ping: player.ping,
                                    displayName: undefined,
                                },
                            ],
                        },
                    });
                    if (player.entity) {
                        packets.push({
                            name: 'named_entity_spawn',
                            data: {
                                entityId: player.entity.id,
                                playerUUID: player.uuid,
                                x: player.entity.position.x,
                                y: player.entity.position.y,
                                z: player.entity.position.z,
                                yaw: player.entity.yaw,
                                pitch: player.entity.pitch,
                                metadata: this.metadata[player.entity.id],
                            },
                        });
                    }
                }
            }
        }
        //* map_chunk (s)
        let columnArray = bot.world.getColumns();
        for (const index in columnArray) {
            if (Object.prototype.hasOwnProperty.call(columnArray, index)) {
                const { chunkX, chunkZ, column } = columnArray[index];
                packets.push({
                    name: 'map_chunk',
                    data: {
                        x: chunkX,
                        z: chunkZ,
                        bitMap: column.getMask(),
                        chunkData: column.dump(),
                        groundUp: true,
                        blockEntities: [],
                    },
                });
            }
        }
        //* position
        packets.push({
            name: 'position',
            data: {
                x: bot.entity.position.x,
                y: bot.entity.position.y,
                z: bot.entity.position.z,
                yaw: bot.entity.yaw,
                pitch: bot.entity.pitch,
            },
        });
        //* entity stuff
        for (const index in bot.entities) {
            if (Object.prototype.hasOwnProperty.call(bot.entities, index)) {
                const entity = bot.entities[index];
                switch (entity.type) {
                    case 'orb':
                        packets.push({
                            name: 'spawn_entity_experience_orb',
                            data: {
                                entityId: entity.id,
                                x: entity.position.x,
                                y: entity.position.y,
                                z: entity.position.z,
                                count: entity.count,
                            },
                        });
                        break;
                    case 'player':
                        {
                            //* handled with the player_info packets
                        }
                        break;
                    case 'mob':
                        packets.push({
                            name: 'spawn_entity_living',
                            data: {
                                entityId: entity.id,
                                entityUUID: entity.uuid,
                                type: entity.entityType,
                                x: entity.position.x,
                                y: entity.position.y,
                                z: entity.position.z,
                                yaw: entity.yaw,
                                pitch: entity.pitch,
                                headPitch: entity.headPitch,
                                velocityX: entity.velocity.x,
                                velocityY: entity.velocity.y,
                                velocityZ: entity.velocity.z,
                                metadata: this.metadata[entity.id],
                            },
                        });
                        // packets.push({
                        //   name: 'entity_metadata',
                        //   data: {
                        //     entityId: (entity as any).id,
                        //     metadata: parseMetadata(entity.metadata),
                        //   },
                        // });
                        break;
                    //!WIP
                    case 'global':
                        //packets.push()
                        break;
                }
            }
        }
        return packets;
    }
    link(pclient) {
        this.pclient = pclient;
        this.bot._client.write = () => { };
        this.bot._client.writeChannel = () => { };
        this.bot._client.writeRaw = () => { };
        this.pclient.on('packet', (data, packetMeta) => {
            if (!['keep_alive'].includes(packetMeta.name)) {
                this.write(packetMeta.name, data);
            }
        });
        this.pclient.on('end', (reason) => {
            console.log(reason);
            this.unlink();
        });
    }
    unlink() {
        if (this.pclient) {
            this.bot._client.write = this.write.bind(this.bot._client);
            this.bot._client.writeChannel = this.writeChannel.bind(this.bot._client);
            this.bot._client.writeRaw = this.writeRaw.bind(this.bot._client);
            this.pclient.removeAllListeners();
            this.pclient = undefined;
        }
    }
}
//# sourceMappingURL=index.js.map