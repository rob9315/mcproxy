import mineflayer from "mineflayer";
export class Conn {
    constructor(botOptions, relayExcludedPacketNames) {
        this.write = (name, data) => { };
        this.bot = mineflayer.createBot(botOptions);
        this.write = this.bot._client.write.bind(this.bot._client);
        this.metadata = [];
        this.excludedPacketNames = relayExcludedPacketNames || ["keep_alive"];
        this.bot._client.on("packet", (data, packetMeta) => {
            if (this.pclient) {
                try {
                    this.pclient.write(packetMeta.name, data);
                }
                catch (error) {
                    console.log("there was a write error but it was catched, probably because the pclient disconnected");
                }
            }
        });
        //* entity metadata tracking
        this.bot._client.on("packet", (data, packetMeta) => {
            if (Object.prototype.hasOwnProperty.call(data, "metadata") &&
                Object.prototype.hasOwnProperty.call(data, "entityId") &&
                this.bot.entities[data.entityId]) {
                this.bot.entities[data.entityId].rawMetadata = data.metadata;
            }
        });
    }
    sendPackets(pclient) {
        let packets = this.generatePackets();
        packets.forEach(({ data, name }) => {
            pclient.write(name, data);
        });
    }
    generatePackets() {
        let packets = [];
        //* login
        packets.push({
            name: "respawn",
            data: {
                entityId: this.bot.entity.id,
                gameMode: this.bot.game.gameMode,
                dimension: this.bot.game.dimension,
                difficulty: this.bot.game.difficulty,
                maxPlayers: this.bot.game.maxPlayers,
                levelType: this.bot.game.levelType,
                reducedDebugInfo: false,
            },
        });
        //* game_state_change
        //* sets the gamemode
        packets.push({
            name: "game_state_change",
            data: {
                reason: 3,
                gameMode: this.bot.player.gamemode,
            },
        });
        //* player_info (personal)
        //* the players player_info packet
        packets.push({
            name: "player_info",
            data: {
                action: 0,
                data: [
                    {
                        UUID: this.bot.player.uuid,
                        name: this.bot.username,
                        properties: [],
                        gamemode: this.bot.player.gamemode,
                        ping: this.bot.player.ping,
                        displayName: undefined,
                    },
                ],
            },
        });
        //* player_info
        for (const name in this.bot.players) {
            if (Object.prototype.hasOwnProperty.call(this.bot.players, name)) {
                const player = this.bot.players[name];
                if (player.uuid != this.bot.player.uuid) {
                    packets.push({
                        name: "player_info",
                        data: {
                            action: 0,
                            data: [
                                {
                                    UUID: player.uuid,
                                    name: player.username,
                                    properties: [
                                    //TODO get Textures from mojang
                                    // {
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
                            name: "named_entity_spawn",
                            data: {
                                entityId: player.entity.id,
                                playerUUID: player.uuid,
                                x: player.entity.position.x,
                                y: player.entity.position.y,
                                z: player.entity.position.z,
                                yaw: player.entity.yaw,
                                pitch: player.entity.pitch,
                                metadata: player.entity.rawMetadata,
                            },
                        });
                    }
                }
            }
        }
        function getBlockEntities(bot, chunkX, chunkZ) {
            let blockEntities = [];
            for (const index in bot._blockEntities) {
                if (Object.prototype.hasOwnProperty.call(bot._blockEntities, index)) {
                    const blockEntity = bot._blockEntities[index];
                    if (Math.floor(blockEntity.x / 16) == chunkX && Math.floor(blockEntity.z / 16) == chunkZ) {
                        blockEntities.push(blockEntity.raw);
                    }
                }
            }
            return blockEntities;
        }
        //* map_chunk (s)
        let columnArray = this.bot.world.getColumns();
        for (const index in columnArray) {
            if (Object.prototype.hasOwnProperty.call(columnArray, index)) {
                const { chunkX, chunkZ, column } = columnArray[index];
                packets.push({
                    name: "map_chunk",
                    data: {
                        x: chunkX,
                        z: chunkZ,
                        bitMap: column.getMask(),
                        chunkData: column.dump(),
                        groundUp: true,
                        blockEntities: getBlockEntities(this.bot, chunkX, chunkZ),
                    },
                });
            }
        }
        //* position
        packets.push({
            name: "position",
            data: {
                x: this.bot.entity.position.x,
                y: this.bot.entity.position.y,
                z: this.bot.entity.position.z,
                yaw: this.bot.entity.yaw,
                pitch: this.bot.entity.pitch,
            },
        });
        //* entity stuff
        for (const index in this.bot.entities) {
            if (Object.prototype.hasOwnProperty.call(this.bot.entities, index)) {
                const entity = this.bot.entities[index];
                switch (entity.type) {
                    case "orb":
                        packets.push({
                            name: "spawn_entity_experience_orb",
                            data: {
                                entityId: entity.id,
                                x: entity.position.x,
                                y: entity.position.y,
                                z: entity.position.z,
                                count: entity.count,
                            },
                        });
                        break;
                    case "player":
                        {
                            //* handled with the player_info packets
                        }
                        break;
                    case "mob":
                        packets.push({
                            name: "spawn_entity_living",
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
                                metadata: entity.rawMetadata,
                            },
                        });
                        entity.equipment.forEach((item, index) => {
                            packets.push({
                                name: "entity_equipment",
                                data: {
                                    entityId: entity.id,
                                    slot: index,
                                    item: item,
                                },
                            });
                        });
                        break;
                    //TODO add global
                    case "global":
                        console.log(entity.type, entity);
                        break;
                    case "object":
                        packets.push({
                            name: "spawn_entity",
                            data: {
                                entityId: entity.id,
                                objectUUID: entity.uuid,
                                type: entity.entityType,
                                x: entity.position.x,
                                y: entity.position.y,
                                z: entity.position.z,
                                yaw: entity.yaw,
                                pitch: entity.pitch,
                                objectData: entity.objectData,
                                velocityX: entity.velocity.x,
                                velocityY: entity.velocity.y,
                                velocityZ: entity.velocity.z,
                            },
                        });
                        if (entity.rawMetadata) {
                            packets.push({
                                name: "entity_metadata",
                                data: {
                                    entityId: entity.id,
                                    metadata: entity.rawMetadata,
                                },
                            });
                        }
                        break;
                    //TODO add other?
                    case "other":
                        // console.log(entity.type, entity);
                        break;
                }
            }
        }
        let items = [];
        this.bot.inventory.slots.forEach((item, index) => {
            if (item == null) {
                item = { type: -1 };
            }
            if (item.nbt == null) {
                item.nbt = undefined;
            }
            items[index] = {
                blockId: item.type,
                itemCount: item.count,
                itemDamage: item.metadata,
                nbtData: item.nbt,
            };
        });
        if (items.length > 0) {
            packets.push({
                name: "window_items",
                data: {
                    windowId: 0,
                    items: items,
                },
            });
        }
        if (this.bot.quickBarSlot) {
            packets.push({
                name: "held_item_slot",
                data: {
                    slot: this.bot.quickBarSlot,
                },
            });
        }
        packets.push({
            name: "spawn_position",
            data: {
                location: this.bot.spawnPoint,
            },
        });
        return packets;
    }
    sendLoginPacket(pclient) {
        pclient.write("login", {
            entityId: 9001,
            levelType: "default",
        });
    }
    link(pclient) {
        this.pclient = pclient;
        this.bot._client.write = this.writeIf.bind(this);
        this.pclient.on("packet", (data, packetMeta) => {
            if (!this.excludedPacketNames.includes(packetMeta.name)) {
                this.write(packetMeta.name, data);
            }
            if (packetMeta.name.includes("position")) {
                this.bot.entity.position.x = data.x;
                this.bot.entity.position.y = data.y;
                this.bot.entity.position.z = data.z;
            }
            if (packetMeta.name.includes("look")) {
                this.bot.entity.yaw = data.yaw;
                this.bot.entity.pitch = data.pitch;
            }
            if (packetMeta.name == "held_item_slot") {
                this.bot.quickBarSlot = data.slotId;
            }
        });
        this.pclient.on("end", (reason) => {
            console.log("pclient ended because of reason:", reason);
            this.unlink();
        });
        this.pclient.on("error", (error) => {
            console.log("pclient threw an error, maybe just a disconnection?");
            this.unlink();
        });
    }
    unlink() {
        if (this.pclient) {
            this.bot._client.write = this.write.bind(this.bot._client);
            this.pclient.removeAllListeners();
            this.pclient = undefined;
        }
    }
    writeIf(name, data) {
        if (["keep_alive"].includes(name)) {
            this.write(name, data);
        }
    }
}
//# sourceMappingURL=conn.js.map