import type { Bot } from 'mineflayer';
import type { Client, Packet } from './conn';
import { SmartBuffer } from 'smart-buffer';

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

export function generatePackets(bot: Bot, pclient?: Client) {
  //* if not spawned yet, return nothing
  if (!bot.entity) return [];

  //* load up some helper methods
  const { toNotch: itemToNotch }: typeof import('prismarine-item').Item = require('prismarine-item')(pclient?.protocolVersion ?? bot.version);
  const Vec3: typeof import('vec3').default = require('vec3');
  const UUID = pclient?.uuid ?? bot.player.uuid;

  return [
    [
      'login',
      {
        entityId: bot.entity.id,
        gamemode: bot.player.gamemode,
        dimension: dimension[bot.game.dimension],
        difficulty: difficulty[bot.game.difficulty],
        maxPlayers: bot.game.maxPlayers,
        levelType: bot.game.levelType,
        reducedDebugInfo: false,
      },
    ],
    [
      'respawn',
      {
        gamemode: bot.player.gamemode,
        dimension: dimension[bot.game.dimension],
        difficulty: difficulty[bot.game.difficulty],
        levelType: bot.game.levelType,
      },
    ],
    [
      'abilities',
      {
        flags: (bot.physicsEnabled ? 0b0 : 0b10) | ([1, 3].includes(bot.player.gamemode) ? 0b0 : 0b100) | (bot.player.gamemode !== 1 ? 0b0 : 0b1000),
        flyingSpeed: 0.05,
        walkingSpeed: 0.1,
      },
    ],
    ['held_item_slot', { slot: bot.quickBarSlot ?? 1 }],
    //! declare recipes
    //? tags?
    //? entity status theoretically (current animation playing)
    //? commands / add option to provide own commands
    //! unlock recipes
    //* gamemode
    ['game_state_change', { reason: 3, gameMode: bot.player.gamemode }],
    [
      'update_health',
      {
        health: bot.health,
        food: bot.food,
        foodSaturation: bot.foodSaturation,
      },
    ],
    //* inventory
    [
      'window_items',
      {
        windowId: 0,
        items: bot.inventory.slots.map((item) => itemToNotch(item)),
      },
    ],
    [
      'position',
      {
        ...bot.entity.position,
        yaw: 180 - (bot.entity.yaw * 180) / Math.PI,
        pitch: -(bot.entity.pitch * 180) / Math.PI,
      },
    ],
    [
      'spawn_position',
      {
        location: bot.spawnPoint ?? bot.entity.position,
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
            name: bot.username,
            properties: [],
            gamemode: bot.player.gamemode,
            ping: bot.player.ping,
            displayName: undefined,
          },
        ],
      },
    ],
    //* other players' info
    ...Object.values(bot.players).reduce<Packet[]>(
      (packets, { uuid, username, gamemode, ping, entity }) => [
        ...packets,
        ...((uuid != UUID
          ? [
              [
                'player_info',
                {
                  action: 0,
                  data: [{ UUID: uuid, name: username, properties: [], gamemode, ping, displayName: undefined }],
                },
              ],
              !entity
                ? undefined
                : [
                    'named_entity_spawn',
                    {
                      ...entity.position,
                      entityId: entity.id,
                      playerUUID: uuid,
                      yaw: entity.yaw,
                      pitch: entity.pitch,
                      metadata: (entity as any).rawMetadata,
                    },
                  ],
            ]
          : []) as Packet[]),
      ],
      []
    ),
    ...(bot.world.getColumns() as any[]).reduce<Packet[]>((packets, chunk) => [...packets, ...chunkColumnToPackets(chunk)], []),
    //? `world_border` (as of 1.12.2) => really needed?
    //* block entities
    ...Object.values((bot as any)._blockEntities as Map<string, { x: number; y: number; z: number; raw: Object }>).reduce<(Packet | undefined)[]>(
      (packets, { x, y, z, raw: nbtData }) => {
        let block = bot.blockAt(Vec3({ x, y, z }));
        return [
          ...packets,
          [
            'tile_entity_data',
            {
              location: { x, y, z },
              nbtData,
            },
          ],
          block?.name.includes('chest')
            ? [
                'block_action',
                {
                  location: { x, y, z },
                  byte1: 1,
                  byte2: 0,
                  blockId: block.type,
                },
              ]
            : undefined,
        ];
      },
      []
    ),
    ...Object.values(bot.entities).reduce<(Packet | undefined)[]>((packets, entity) => {
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
          packets.push(
            [
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
            ],
            ...(entity.equipment
              .map((item, slot) =>
                !!item
                  ? undefined
                  : ([
                      'entity_equipment',
                      {
                        entityId: entity.id,
                        slot,
                        item: itemToNotch(item),
                      },
                    ] as Packet | null)
              )
              .filter((v) => !!v) as Packet[])
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
      return [
        ...packets,
        (entity as any).rawMetadata?.length > 0
          ? [
              'entity_metadata',
              {
                entityId: entity.id,
                metadata: (entity as any).rawMetadata,
              },
            ]
          : undefined,
      ];
    }, []),
  ].filter((v) => !!v) as Packet[];
}

//* splits a single chunk column into multiple packets if needed
function chunkColumnToPackets(
  { chunkX: x, chunkZ: z, column }: { chunkX: number; chunkZ: number; column: any },
  lastBitMask?: number,
  chunkData: SmartBuffer = new SmartBuffer()
): Packet[] {
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
          ['map_chunk', { x, z, bitMap, chunkData: chunkData.toBuffer(), groundUp: !lastBitMask, blockEntities: [] }],
          ...chunkColumnToPackets({ chunkX: x, chunkZ: z, column }, 0b1 << i, newChunkData),
        ];
      }
      bitMap ^= 0b1 << i;
      chunkData.writeBuffer(newChunkData.toBuffer());
      newChunkData.clear();
    }
  if (!lastBitMask) column.biomes?.forEach((biome: number) => chunkData.writeUInt8(biome));
  return [['map_chunk', { x, z, bitMap, chunkData: chunkData.toBuffer(), groundUp: !lastBitMask, blockEntities: [] }]];
}