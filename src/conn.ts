import mineflayer from 'mineflayer';
import mc from 'minecraft-protocol';

export const dimension: Record<string, number> = {
  'minecraft:the_end': 1,
  'minecraft:overworld': 0,
  'minecraft:nether': -1,
};

export const gamemode: Record<string, number> = {
  survival: 0,
  creative: 1,
  adventure: 2,
  spectator: 3,
};

export const difficulty: Record<string, number> = {
  peaceful: 0,
  easy: 1,
  normal: 2,
  hard: 3,
};

export interface Packet {
  data: any;
  name: string;
  state?: string;
}

export class Conn {
  bot: mineflayer.Bot;
  pclient?: mc.Client;
  private events: { event: string; listener: (...arg0: any) => void }[];
  private metadata: { [entityId: number]: { key: number; type: number; value: any } };
  excludedPacketNames: string[];
  write = (name: string, data: any): void => {};
  writeRaw = (buffer: any): void => {};
  writeChannel = (channel: any, params: any): void => {};
  constructor(botOptions: mineflayer.BotOptions, relayExcludedPacketNames?: string[]) {
    this.bot = mineflayer.createBot(botOptions);
    this.write = this.bot._client.write.bind(this.bot._client);
    this.writeRaw = this.bot._client.writeRaw.bind(this.bot._client);
    this.writeChannel = this.bot._client.writeChannel.bind(this.bot._client);
    this.metadata = [];
    this.excludedPacketNames = relayExcludedPacketNames || ['keep_alive'];
    this.bot._client.on('packet', (data, packetMeta) => {
      if (this.pclient) {
        try {
          this.pclient.write(packetMeta.name, data);
        } catch (error) {
          console.log('pclient disconnected');
        }
      }
    });
    this.events = [
      {
        event: 'packet',
        listener: (data, packetMeta) => {
          if (!this.excludedPacketNames.includes(packetMeta.name)) {
            this.write(packetMeta.name, data);
          }
          if (packetMeta.name.includes('position')) {
            this.bot.entity.position.x = data.x;
            this.bot.entity.position.y = data.y;
            this.bot.entity.position.z = data.z;
          }
          // if (packetMeta.name.includes('look')) {
          //   this.bot.entity.yaw = data.yaw;
          //   this.bot.entity.pitch = data.pitch;
          // }
          if (packetMeta.name == 'held_item_slot') {
            this.bot.quickBarSlot = data.slotId;
          }
        },
      },
      {
        event: 'end',
        listener: (reason) => {
          console.log('pclient ended because of reason:', reason);
          this.unlink();
        },
      },
      {
        event: 'error',
        listener: () => {
          this.unlink();
        },
      },
    ];
    //* entity metadata tracking
    this.bot._client.on('packet', (data) => {
      if (Object.prototype.hasOwnProperty.call(data, 'metadata') && Object.prototype.hasOwnProperty.call(data, 'entityId') && this.bot.entities[data.entityId]) {
        (this.bot.entities[data.entityId] as any).rawMetadata = data.metadata;
      }
    });
  }

  sendPackets(pclient: mc.Client) {
    let packets: Packet[] = this.generatePackets();
    packets.forEach(({ data, name }) => {
      pclient.write(name, data);
    });
  }

  generatePackets(): Packet[] {
    let packets: Packet[] = [];

    //* login
    packets.push({
      name: 'login',
      data: {
        entityId: (this.bot.entity as any).id,
        gamemode: gamemode[this.bot.game.gameMode],
        dimension: dimension[this.bot.game.dimension],
        difficulty: difficulty[this.bot.game.difficulty],
        maxPlayers: this.bot.game.maxPlayers,
        levelType: this.bot.game.levelType,
        reducedDebugInfo: false,
      },
    });

    packets.push({
      name: 'spawn_position',
      data: {
        location: this.bot.entity.position,
      },
    });

    packets.push({
      name: 'respawn',
      data: {
        gamemode: gamemode[this.bot.game.gameMode],
        dimension: dimension[this.bot.game.dimension],
        difficulty: difficulty[this.bot.game.difficulty],
        levelType: this.bot.game.levelType,
      },
    });

    //* position
    packets.push({
      name: 'position',
      data: {
        x: this.bot.entity.position.x,
        y: this.bot.entity.position.y,
        z: this.bot.entity.position.z,
        yaw: this.bot.entity.yaw,
        pitch: this.bot.entity.pitch,
      },
    });

    packets.push({
      name: 'spawn_position',
      data: {
        location: this.bot.spawnPoint,
      },
    });

    //* game_state_change
    //* sets the gamemode
    packets.push({
      name: 'game_state_change',
      data: {
        reason: 3,
        gameMode: this.bot.player.gamemode,
      },
    });

    packets.push({
      name: 'update_health',
      data: {
        health: this.bot.health,
        food: this.bot.food,
        foodSaturation: this.bot.foodSaturation,
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
            name: 'player_info',
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
              name: 'named_entity_spawn',
              data: {
                entityId: (player.entity as any).id,
                playerUUID: player.uuid,
                x: player.entity.position.x,
                y: player.entity.position.y,
                z: player.entity.position.z,
                yaw: player.entity.yaw,
                pitch: player.entity.pitch,
                metadata: (player.entity as any).rawMetadata,
              },
            });
          }
        }
      }
    }

    function getBlockEntities(bot: mineflayer.Bot, chunkX: number, chunkZ: number) {
      let blockEntities = [];
      for (const index in (bot as any)._blockEntities) {
        if (Object.prototype.hasOwnProperty.call((bot as any)._blockEntities, index)) {
          const blockEntity = (bot as any)._blockEntities[index];
          if (Math.floor(blockEntity.x / 16) == chunkX && Math.floor(blockEntity.z / 16) == chunkZ) {
            blockEntities.push(blockEntity.raw);
          }
        }
      }
      return blockEntities;
    }

    //* map_chunk (s)
    let columnArray = (this.bot as any).world.getColumns();
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
            blockEntities: getBlockEntities(this.bot, chunkX, chunkZ),
          },
        });
      }
    }

    //* entity stuff
    for (const index in this.bot.entities) {
      if (Object.prototype.hasOwnProperty.call(this.bot.entities, index)) {
        const entity = this.bot.entities[index];
        switch (entity.type) {
          case 'orb':
            packets.push({
              name: 'spawn_entity_experience_orb',
              data: {
                entityId: ((entity as unknown) as any).id,
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
                entityId: ((entity as unknown) as any).id,
                entityUUID: ((entity as unknown) as any).uuid,
                type: entity.entityType,
                x: entity.position.x,
                y: entity.position.y,
                z: entity.position.z,
                yaw: entity.yaw,
                pitch: entity.pitch,
                headPitch: (entity as any).headPitch,
                velocityX: entity.velocity.x,
                velocityY: entity.velocity.y,
                velocityZ: entity.velocity.z,
                metadata: (entity as any).rawMetadata,
              },
            });

            entity.equipment.forEach((item, index) => {
              packets.push({
                name: 'entity_equipment',
                data: {
                  entityId: (entity as any).id,
                  slot: index,
                  item: item,
                },
              });
            });
            break;

          //TODO add global
          case 'global':
            console.log(entity.type, entity);
            break;

          case 'object':
            packets.push({
              name: 'spawn_entity',
              data: {
                entityId: (entity as any).id,
                objectUUID: (entity as any).uuid,
                type: entity.entityType,
                x: entity.position.x,
                y: entity.position.y,
                z: entity.position.z,
                yaw: entity.yaw,
                pitch: entity.pitch,
                objectData: (entity as any).objectData,
                velocityX: entity.velocity.x,
                velocityY: entity.velocity.y,
                velocityZ: entity.velocity.z,
              },
            });
            if ((entity as any).rawMetadata) {
              packets.push({
                name: 'entity_metadata',
                data: {
                  entityId: (entity as any).id,
                  metadata: (entity as any).rawMetadata,
                },
              });
            }
            break;

          //TODO add other?
          case 'other':
            // console.log(entity.type, entity);
            break;
        }
      }
    }

    let items: {
      blockId: number;
      itemCount: number | undefined;
      itemDamage: number | undefined;
      nbtData: any | undefined;
    }[] = [];

    this.bot.inventory.slots.forEach((item, index) => {
      if (item == null) {
        (item as any) = { type: -1 };
      }
      if (item.nbt == null) {
        (item.nbt as any) = undefined;
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
        name: 'window_items',
        data: {
          windowId: 0,
          items: items,
        },
      });
    }

    if (this.bot.quickBarSlot) {
      packets.push({
        name: 'held_item_slot',
        data: {
          slot: this.bot.quickBarSlot,
        },
      });
    }

    return packets;
  }
  sendLoginPacket(pclient: mc.Client): void {
    pclient.write('login', {
      entityId: 9001,
      levelType: 'default',
      dimension: 1,
    });
  }
  link(pclient: mc.Client): void {
    this.pclient = pclient;
    this.bot._client.write = this.writeIf.bind(this);
    this.bot._client.writeRaw = (buffer: any) => {};
    this.bot._client.writeChannel = (channel: any, params: any) => {};
    this.events.forEach((event) => {
      (this.pclient as any).on(event.event as any, event.listener);
    });
  }
  unlink(): void {
    if (this.pclient) {
      this.bot._client.write = this.write.bind(this.bot._client);
      this.bot._client.writeRaw = this.writeRaw.bind(this.bot._client);
      this.bot._client.writeChannel = this.writeChannel.bind(this.bot._client);
      this.events.forEach((event) => {
        this.pclient?.removeListener(event.event, event.listener);
      });
      this.pclient = undefined;
    }
  }
  writeIf(name: string, data: any): void {
    if (['keep_alive'].includes(name)) {
      this.write(name, data);
    }
  }
  disconnect() {
    this.bot._client.end('fuckyouigo');
    this.unlink();
  }
}
