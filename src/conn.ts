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

export type Packet = [name: string, data: any];

export interface connOptions {
  consolePrints?: boolean;
  events?: { event: string; listener: (...arg0: any) => void }[];
}

export class Conn {
  bot: Bot;
  pclient?: Client;
  private events: { event: string; listener: (...arg0: any) => void }[];
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
    this.bot._client.on('packet', (data, { name }) => {
      //* relay packet
      this.pclient?.write(name, data);
      //* entity metadata tracking
      if (data.metadata && data.entityId && this.bot.entities[data.entityId]) (this.bot.entities[data.entityId] as any).rawMetadata = data.metadata;
    });

    this.events = [
      {
        event: 'packet',
        listener: (data, { name }) => {
          if (!this.excludedPacketNames.includes(name)) {
            this.write(name, data);
          }
          if (name.includes('position')) {
            this.bot.entity.position.x = data.x;
            this.bot.entity.position.y = data.y;
            this.bot.entity.position.z = data.z;
            this.bot.entity.onGround = data.onGround;
          }
          if (name.includes('look')) {
            this.bot.entity.yaw = ((180 - data.yaw) * Math.PI) / 180;
            this.bot.entity.pitch = -(data.pitch * Math.PI) / 180;
            this.bot.entity.onGround = data.onGround;
          }
          if (name == 'held_item_slot') {
            this.bot.quickBarSlot = data.slotId;
          }
          if (name == 'abilities') {
            this.bot.physicsEnabled = !!((data.flags & 0b10) ^ 0b10);
          }
        },
      },
      { event: 'end', listener: this.unlink },
      { event: 'error', listener: this.unlink },
    ];
    if (options?.events) this.events = [...options?.events, ...this.events];
  }

  sendPackets(pclient: Client) {
    this.generatePackets(pclient).forEach((packet) => pclient.write(...packet));
  }

  generatePackets(pclient?: Client): Packet[] {
    if (!this.bot.entity) return [];
    // needed for transformation of items to notchItem format
    const Item: typeof import('prismarine-item').Item = require('prismarine-item')(pclient?.protocolVersion ?? this.bot.version);

    let UUID = pclient?.uuid ?? this.bot.player.uuid;
    let packets: Packet[] = [
      [
        'login',
        {
          entityId: this.bot.entity.id,
          gamemode: this.bot.player.gamemode,
          dimension: dimension[this.bot.game.dimension],
          difficulty: difficulty[this.bot.game.difficulty],
          maxPlayers: this.bot.game.maxPlayers,
          levelType: this.bot.game.levelType,
          reducedDebugInfo: false,
        },
      ],
      [
        'respawn',
        {
          gamemode: this.bot.player.gamemode,
          dimension: dimension[this.bot.game.dimension],
          difficulty: difficulty[this.bot.game.difficulty],
          levelType: this.bot.game.levelType,
        },
      ],
      [
        'abilities',
        {
          flags: (this.bot.physicsEnabled ? 0b0 : 0b10) | ([1, 3].includes(this.bot.player.gamemode) ? 0b0 : 0b100) | (this.bot.player.gamemode !== 1 ? 0b0 : 0b1000),
          flyingSpeed: 0.05,
          walkingSpeed: 0.1,
        },
      ],
      ['held_item_slot', { slot: this.bot.quickBarSlot ?? 1 }],
      //! declare recipes
      //? tags?
      //? entity status theoretically (current animation playing)
      //? commands / add option to provide own commands
      //! unlock recipes
      //* gamemode
      ['game_state_change', { reason: 3, gameMode: this.bot.player.gamemode }],
      [
        'update_health',
        {
          health: this.bot.health,
          food: this.bot.food,
          foodSaturation: this.bot.foodSaturation,
        },
      ],
      //* inventory
      [
        'window_items',
        {
          windowId: 0,
          items: this.bot.inventory.slots.map((item) => Item.toNotch(item)),
        },
      ],
      [
        'position',
        {
          ...this.bot.entity.position,
          yaw: 180 - (this.bot.entity.yaw * 180) / Math.PI,
          pitch: -(this.bot.entity.pitch * 180) / Math.PI,
        },
      ],
      [
        'spawn_position',
        {
          location: this.bot.spawnPoint ?? this.bot.entity.position,
        },
      ],
      //! move playerlist here
      //* player_info (personal)
      //* the client's player_info packet
      [
        'player_info',
        {
          action: 0,
          data: [
            {
              UUID,
              name: this.bot.username,
              properties: [],
              gamemode: this.bot.player.gamemode,
              ping: this.bot.player.ping,
              displayName: undefined,
            },
          ],
        },
      ],
      ...map_chunk.bind(this)(),
      //? `world_border` (as of 1.12.2) => really needed?
    ];

    //* player_info
    for (const username in this.bot.players) {
      if (Object.prototype.hasOwnProperty.call(this.bot.players, username)) {
        const { uuid: UUID, username: name, gamemode, ping, entity } = this.bot.players[username];
        if (UUID != this.bot.player.uuid) {
          packets.push([
            'player_info',
            {
              action: 0,
              data: [{ UUID, name, properties: [], gamemode, ping, displayName: undefined }],
            },
          ]);

          if (entity)
            packets.push([
              'named_entity_spawn',
              {
                ...entity.position,
                entityId: entity.id,
                playerUUID: UUID,
                yaw: entity.yaw,
                pitch: entity.pitch,
                metadata: (entity as any).rawMetadata,
              },
            ]);
        }
      }
    }

    function map_chunk(this: Conn) {
      return (this.bot.world.getColumns() as any[]).reduce<Packet[]>((packets, chunk) => [...packets, ...chunkColumnToPackets(chunk)], []);
    }

    //* splits a single chunk column into multiple packets if needed
    function chunkColumnToPackets({ chunkX: x, chunkZ: z, column }: { chunkX: number; chunkZ: number; column: any }, lastBitMask?: number, chunkData: SmartBuffer = new SmartBuffer()): Packet[] {
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
            return [['map_chunk', { x, z, bitMap, chunkData: chunkData.toBuffer(), groundUp: !lastBitMask, blockEntities: [] }], ...chunkColumnToPackets({ chunkX: x, chunkZ: z, column }, 0b1 << i, newChunkData)];
          }
          bitMap ^= 0b1 << i;
          chunkData.writeBuffer(newChunkData.toBuffer());
          newChunkData.clear();
        }
      if (!lastBitMask) column.biomes?.forEach((biome: number) => chunkData.writeUInt8(biome));
      return [['map_chunk', { x, z, bitMap, chunkData: chunkData.toBuffer(), groundUp: !lastBitMask, blockEntities: [] }]];
    }

    //* Block Entities
    for (const [, { x, y, z, raw: nbtData }] of (this.bot as any)._blockEntities as Map<string, { x: number; y: number; z: number; raw: Object }>)
      packets.push([
        'tile_entity_data',
        {
          location: { x, y, z },
          nbtData,
        },
      ]);

    //* entity stuff
    for (const index in this.bot.entities) {
      if (Object.prototype.hasOwnProperty.call(this.bot.entities, index)) {
        const entity = this.bot.entities[index];
        switch (entity.type) {
          case 'orb':
            packets.push([
              'spawn_entity_experience_orb',
              {
                ...entity.position,
                entityId: entity.id,
                count: entity.count,
              },
            ]);
            break;

          case 'mob':
            packets.push([
              'spawn_entity_living',
              {
                ...entity.position,
                entityId: entity.id,
                entityUUID: (entity as any).uuid,
                type: entity.entityType,
                yaw: entity.yaw,
                pitch: entity.pitch,
                headPitch: (entity as any).headPitch,
                velocityX: entity.velocity.x,
                velocityY: entity.velocity.y,
                velocityZ: entity.velocity.z,
                metadata: (entity as any).rawMetadata,
              },
            ]);
            entity.equipment.forEach((item, slot) =>
              packets.push([
                'entity_equipment',
                {
                  entityId: entity.id,
                  slot,
                  item: Item.toNotch(item),
                },
              ])
            );
            break;

          case 'object':
            packets.push([
              'spawn_entity',
              {
                ...entity.position,
                entityId: entity.id,
                objectUUID: (entity as any).uuid,
                type: entity.entityType,
                yaw: entity.yaw,
                pitch: entity.pitch,
                objectData: (entity as any).objectData,
                velocityX: entity.velocity.x,
                velocityY: entity.velocity.y,
                velocityZ: entity.velocity.z,
              },
            ]);
            break;

          default:
            //TODO add more?
            break;
        }
        if ((entity as any).rawMetadata) {
          packets.push([
            'entity_metadata',
            {
              entityId: entity.id,
              metadata: (entity as any).rawMetadata,
            },
          ]);
        }
      }
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
}
