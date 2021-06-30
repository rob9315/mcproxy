import { Bot, BotOptions, createBot } from 'mineflayer';
import { SmartBuffer } from 'smart-buffer';
import type { Client } from 'minecraft-protocol';

const MAX_CHUNK_DATA_LENGTH = 31598;

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

export interface connOptions {
  consolePrints?: boolean;
  events?: { event: string; listener: (...arg0: any) => void }[];
}

export class Conn {
  bot: Bot;
  pclient?: Client;
  private events: { event: string; listener: (...arg0: any) => void }[];
  // private metadata: { [entityId: number]: { key: number; type: number; value: any } } = [];
  excludedPacketNames: string[];
  write: (name: string, data: any) => void = () => {};
  writeRaw: (buffer: any) => void = () => {};
  writeChannel: (channel: any, params: any) => void = () => {};
  consolePrints: boolean;
  constructor(botOptions: BotOptions, relayExcludedPacketNames?: string[], options?: connOptions) {
    this.bot = createBot(botOptions);
    this.write = this.bot._client.write.bind(this.bot._client);
    this.writeRaw = this.bot._client.writeRaw.bind(this.bot._client);
    this.writeChannel = this.bot._client.writeChannel.bind(this.bot._client);
    this.excludedPacketNames = relayExcludedPacketNames || ['keep_alive'];
    this.consolePrints = options?.consolePrints ?? false;
    this.bot._client.on('packet', (data, packetMeta) => {
      try {
        this.pclient?.write(packetMeta.name, data);
      } catch {
        this.log('pclient disconnected');
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
          if (packetMeta.name.includes('look')) {
            this.bot.entity.yaw = ((180 - data.yaw) * Math.PI) / 180;
            this.bot.entity.pitch = ((360 - data.pitch) * Math.PI) / 180;
          }
          if (packetMeta.name == 'held_item_slot') {
            this.bot.quickBarSlot = data.slotId;
          }
        },
      },
      {
        event: 'end',
        listener: (reason) => {
          this.log('pclient ended because of reason:', reason);
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
    if (options?.events) this.events = [...options?.events, ...this.events];
    //* entity metadata tracking
    this.bot._client.on('packet', (data) => {
      if (data.metadata && data.entityId && this.bot.entities[data.entityId]) (this.bot.entities[data.entityId] as any).rawMetadata = data.metadata;
    });
  }

  sendPackets(pclient: Client) {
    this.generatePackets().forEach(({ data, name }) => pclient.write(name, data));
  }

  generatePackets(): Packet[] {
    let packets: Packet[] = [];

    //* login
    packets.push({
      name: 'login',
      data: {
        entityId: this.bot.entity.id,
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
        ...this.bot.entity.position,
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
                entityId: player.entity.id,
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

    //* map_chunk (s)
    this.bot.world.getColumns().forEach((chunk: any) => packets.push(...chunkColumnToPackets.bind(this)(chunk)));

    //*generates multiple packets from a chunk column, if needed
    function chunkColumnToPackets(this: Conn, { chunkX: x, chunkZ: z, column }: { chunkX: number; chunkZ: number; column: any }, lastBitMask?: number, chunkData: SmartBuffer = new SmartBuffer()): Packet[] {
      let bitMask = !!lastBitMask ? column.getMask() ^ (column.getMask() & ((lastBitMask << 1) - 1)) : column.getMask();
      let bitMap = lastBitMask ?? 0b0;
      let newChunkData = new SmartBuffer();
      // checks with bitmask if there is a chunk in memory that (a) exists and (b) was not sent to the client yet
      for (let i = 0; i < 16; i++)
        if (bitMask & (0b1 << i)) {
          column.sections[i].write(newChunkData);
          bitMask ^= 0b1 << i;
          if (chunkData.length + newChunkData.length > MAX_CHUNK_DATA_LENGTH) {
            if (!lastBitMask) column.biomes?.forEach((biome: number) => chunkData.writeUInt8(biome));
            return [
              {
                name: 'map_chunk',
                data: { x, z, bitMap, chunkData: chunkData.toBuffer(), groundUp: !lastBitMask, blockEntities: [] },
              },
              ...chunkColumnToPackets.bind(this)({ chunkX: x, chunkZ: z, column }, 0b1 << i, newChunkData),
            ];
          }
          bitMap ^= 0b1 << i;
          chunkData.writeBuffer(newChunkData.toBuffer());
          newChunkData.clear();
        }
      if (!lastBitMask) column.biomes?.forEach((biome: number) => chunkData.writeUInt8(biome));
      return [
        {
          name: 'map_chunk',
          data: { x, z, bitMap, chunkData: chunkData.toBuffer(), groundUp: !lastBitMask, blockEntities: [] },
        },
      ];
    }

    //* Block Entities
    for (const [, { x, y, z, raw }] of (this.bot as any)._blockEntities as Map<string, { x: number; y: number; z: number; raw: Object }>)
      packets.push({
        name: 'tile_entity_data',
        data: { location: { x, y, z }, nbtData: raw },
      });

    //* entity stuff
    for (const index in this.bot.entities) {
      if (Object.prototype.hasOwnProperty.call(this.bot.entities, index)) {
        const entity = this.bot.entities[index];
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
                entityUUID: (entity as any).uuid,
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
                  entityId: entity.id,
                  slot: index,
                  item: item,
                },
              });
            });
            break;

          //TODO add global
          case 'global':
            this.log(entity.type, entity);
            break;

          case 'object':
            packets.push({
              name: 'spawn_entity',
              data: {
                entityId: entity.id,
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
                  entityId: entity.id,
                  metadata: (entity as any).rawMetadata,
                },
              });
            }
            break;

          //TODO add other?
          case 'other':
            // console.log(entity.type, entity);
            break;
          default:
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
      item = item ?? { type: -1 };
      item.nbt = item.nbt ?? undefined;
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
  sendLoginPacket(pclient: Client): void {
    pclient.write('login', {
      entityId: 9001,
      levelType: 'default',
      dimension: 1,
    });
  }
  link(pclient: Client): void {
    this.pclient = pclient;
    this.bot._client.write = this.writeIf.bind(this);
    this.bot._client.writeRaw = () => {};
    this.bot._client.writeChannel = () => {};
    this.events.forEach(({ event, listener }) => this.pclient?.on(event, listener));
  }
  unlink(): void {
    if (this.pclient) {
      this.bot._client.write = this.write.bind(this.bot._client);
      this.bot._client.writeRaw = this.writeRaw.bind(this.bot._client);
      this.bot._client.writeChannel = this.writeChannel.bind(this.bot._client);
      this.events.forEach(({ event, listener }) => this.pclient?.removeListener(event, listener));
      this.pclient = undefined;
    }
  }
  writeIf(name: string, data: any): void {
    if (['keep_alive'].includes(name)) this.write(name, data);
  }
  disconnect() {
    this.bot._client.end('conn: disconnect called');
    this.unlink();
  }
  log(...args: any[]) {
    if (this.consolePrints) console.log(...args);
  }
}
