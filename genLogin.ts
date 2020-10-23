import mineflayer from 'mineflayer';
import mc from 'minecraft-protocol';
import mcdata from 'minecraft-data';

export function genLogin(bot: mineflayer.Bot, client: mc.Client) {
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

  ((bot as unknown) as any).world.getColumns();

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
  //   ((bot.entities as unknown) as mcdata.Entities).forEach((entity) => {
  //     switch (true) {
  //       case hP(entity, [
  //         'id',
  //         'uuid',
  //         'type',
  //         'position',
  //         'pitch',
  //         'yaw',
  //         'metadata',
  //         'velocity',
  //       ]):
  //         client.write('spawn_entity', {
  //           entityId: entity.id,
  //           objectUUID: ((entity as unknown) as any).uuid,
  //         });
  //         break;

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
  if (!['keep_alive'].includes(meta.name)) {
    sender.write(meta.name, data);
    console.log(meta.name, data);
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

//! SENDING A MESSAGE
// proxyClient.write("chat", {message: '{"translate":"chat.type.announcement","with":[{"text":"Server"},{"extra":[{"text":"hi"}],"text":""}]}'})
