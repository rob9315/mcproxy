import mineflayer from 'mineflayer';
import mc from 'minecraft-protocol';
import { botconn } from './app.js';

interface Packet {
  data: any;
  name: string;
  state?: string;
}

export class Conn {
  bot: mineflayer.Bot;
  pclient: mc.Client | undefined;
  metadata: { [entityId: number]: { key: number; type: number; value: any } };
  write = (name: string, data: any): void => {};
  constructor(botOptions: mineflayer.BotOptions) {
    this.bot = mineflayer.createBot(botOptions);
    this.write = this.bot._client.write.bind(this.bot._client);
    this.metadata = [];
    this.bot._client.on('packet', (data, packetMeta) => {
      if (this.pclient) {
        try {
          this.pclient.write(packetMeta.name, data);
        } catch (error) {
          console.log(
            'there was a write error but it was catched, probably because the pclient disconnected',
          );
        }
      }
    });

    //* entity metadata tracking
    this.bot._client.on('packet', (data, packetMeta) => {
      if (
        Object.prototype.hasOwnProperty.call(data, 'metadata') &&
        Object.prototype.hasOwnProperty.call(data, 'entityId') &&
        this.bot.entities[data.entityId]
      ) {
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
    let bot = botconn.bot;
    let packets: Packet[] = [];

    //* login
    packets.push({
      name: 'login',
      data: {
        entityId: (bot.entity as any).id,
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
                    //TODO get Textures from mojang
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

    //* map_chunk (s)
    let columnArray = (bot as any).world.getColumns();
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
            blockEntities: [], //TODO add blockEntities
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
            break;

          //TODO add global
          case 'global':
            // console.log(entity.type, entity);
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

    if (bot.quickBarSlot) {
      packets.push({
        name: 'held_item_slot',
        data: {
          slot: bot.quickBarSlot,
        },
      });
    }

    return packets;
  }

  link(pclient: mc.Client): void {
    this.pclient = pclient;
    this.bot._client.write = this.writeIf.bind(this);
    this.pclient.on('packet', (data, packetMeta) => {
      if (!['keep_alive'].includes(packetMeta.name)) {
        this.write(packetMeta.name, data);
      }
      if (packetMeta.name.includes('position')) {
        this.bot.entity.position.x = data.x;
        this.bot.entity.position.y = data.y;
        this.bot.entity.position.z = data.z;
      }
      if (packetMeta.name.includes('look')) {
        this.bot.entity.yaw = data.yaw;
        this.bot.entity.pitch = data.pitch;
      }
      if (packetMeta.name == 'held_item_slot') {
        this.bot.quickBarSlot = data.slotId;
      }
    });
    this.pclient.on('end', (reason) => {
      console.log('pclient ended because of reason:', reason);
      this.unlink();
    });
    this.pclient.on('error', (error) => {
      console.log('pclient threw an error, maybe just a disconnection?');
      this.unlink();
    });
  }
  unlink(): void {
    if (this.pclient) {
      this.bot._client.write = this.write.bind(this.bot._client);
      this.pclient.removeAllListeners();
      this.pclient = undefined;
    }
  }
  writeIf(name: string, data: any): void {
    if (['keep_alive'].includes(name)) {
      this.write(name, data);
    }
  }
}
