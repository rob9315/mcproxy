import mineflayer, { Bot } from 'mineflayer';
import mc from 'minecraft-protocol';
import mcdata from 'minecraft-data';
import pentity from 'prismarine-entity';

export function genLogin(bot: mineflayer.Bot, client: mc.Client) {
  client.on('packet', (data, packetMeta) => {
    console.log('client', packetMeta.name, data);
  });
  send(
    {
      data: {
        entityId: ((bot.entity as unknown) as mcdata.Entity).id,
        gameMode: bot.player.gamemode,
        dimension: bot.game.dimension,
        difficulty: bot.game.difficulty,
        maxPlayers: bot.game.maxPlayers,
        levelType: bot.game.levelType,
        reducedDebugInfo: false,
      },
      meta: { name: 'login' },
    },
    client,
  );

  let columnArray = ((bot as unknown) as any).world.getColumns();

  for (const index in columnArray) {
    if (Object.prototype.hasOwnProperty.call(columnArray, index)) {
      const chunk = columnArray[index];
      send(
        buildChunkPacket({
          x: chunk.chunkX,
          z: chunk.chunkZ,
          chunk: chunk.column,
        }),
        client,
      );
    }
  }

  for (const index in bot.entities) {
    if (Object.prototype.hasOwnProperty.call(bot.entities, index)) {
      const entity = bot.entities[index];
      sendEntity(entity, client);
    }
  }

  bot._client.on('packet', (data, packetMeta) => {
    if (packetMeta.name != 'keep_alive') {
      client.write(packetMeta.name, data);
    }
  });
  client.on('packet', (data, packetMeta) => {
    if (packetMeta.name != 'keep_alive') {
      bot._client.write(packetMeta.name, data);
    }
  });

  //       default:
  //         break;
  //     }
  //   });
}

function buildChunkPacket({
  x,
  z,
  chunk,
}: {
  x: string;
  z: string;
  chunk: any;
}) {
  var meta = { name: 'map_chunk' };
  var data = {
    x: x,
    z: z,
    groundUp: true,
    bitMap: chunk.getMask(),
    chunkData: chunk.dump(),
    blockEntities: [],
  };
  return { data, meta };
}

function send({ data, meta }: any, sender: mc.Client) {
  if (!['keep_alive', ''].includes(meta.name)) {
    console.log(meta.name, data);
    sender.write(meta.name, data);
  }
}

//* hP stands for hasProperty
function hP(object: any, keys: string[]) {
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      return false;
    }
  });
  return true;
}

function sendEntity(entity: pentity.Entity, sender: mc.Client) {
  switch (entity.type) {
    case 'player':
      send(
        {
          data: {
            entityId: ((entity as unknown) as any).id,
            playerUUID: ((entity as unknown) as any).uuid,
            x: entity.position.x,
            y: entity.position.y,
            z: entity.position.z,
            yaw: entity.yaw,
            pitch: entity.pitch,
            metadata: entity.metadata,
          },
          meta: { name: 'named_entity_spawn' },
        },
        sender,
      );
      break;

    case 'mob':
      send(
        {
          data: {
            entityId: ((entity as unknown) as any).id,
          },
          meta: { name: '' },
        },
        sender,
      );
      break;

    case 'orb':
      send(
        {
          data: {
            entityId: ((entity as unknown) as any).id,
            x: entity.position.x,
            y: entity.position.y,
            z: entity.position.z,
            count: entity.count,
          },
          meta: { name: 'spawn_entity_experience_orb' },
        },
        sender,
      );
      break;

    case 'global':
      send(
        {
          data: {
            entityId: ((entity as unknown) as any).id,
          },
          meta: { name: '' },
        },
        sender,
      );
      break;
  }
}

//! SENDING A MESSAGE
// proxyClient.write("chat", {message: '{"translate":"chat.type.announcement","with":[{"text":"Server"},{"extra":[{"text":"hi"}],"text":""}]}'})
