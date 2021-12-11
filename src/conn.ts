import { Bot, BotOptions, createBot } from 'mineflayer';
import type { Client as mcpClient, PacketMeta } from 'minecraft-protocol';
import { generatePackets } from './packets';

export type Packet = [name: string, data: any];

export type ClientEventTuple = [event: string, listener: (...args: any) => void];
export type ClientEvents = (ClientEventTuple | ((conn: Conn, pclient: Client) => ClientEventTuple))[];

export type Client = mcpClient & {
  //* whitelist overwrites not being the main pclient
  toServerWhiteList?: string[];
  //* filter for when the client is the main client
  toServerBlackList?: string[];
  //* filter when the client is attached
  toClientBlackList?: string[];

  toClientMiddleware: PacketMiddleware;
  toServerMiddleware: PacketMiddleware;
};

export class ConnOptions {
  events: ClientEvents = [];
  //* a whitelist for the internal bot
  internalWhitelist: string[] = ['keep_alive'];
  //* filter for the main client as long as it is not overwritten by the client itself
  toServerBlackList: string[] = ['keep_alive'];
  //* filter for all attached clients if it is not overwritten by the client
  toClientBlackList: string[] = ['keep_alive'];
  //* Middleware to control packets being send to the client and server
  toClientMiddleware?: PacketMiddleware = (): void | Promise<void> => {}
  toServerMiddleware?: PacketMiddleware = (): void | Promise<void> => {}
}

export interface PacketMiddleware {
  (info: {
    bound: 'server' | 'client',
    writeType: 'packet' | 'rawPacket' | 'channel',
    meta: PacketMeta
  }, pclient: Client, data: any, cancel: () => void): void | Promise<void>;
}

function DefaultMiddleware(this: any, info: {
  bound: 'server' | 'client',
  writeType: 'packet' | 'rawPacket' | 'channel',
  meta: PacketMeta
}, pclient: Client, data: any, cancel: () => void): void | Promise<void> {
  if ((info.bound === 'client' && (pclient.toClientBlackList ?? this.options.toClientBlackList).includes(data.name)) 
    || (info.bound === 'server' && (pclient.toServerBlackList ?? this.options.toServerBlackList).includes(data.name))) cancel()
}

export class Conn {
  options: ConnOptions;
  bot: Bot & { recipes: number[] };
  pclient: Client | undefined;
  pclients: Client[] = [];
  toClientMiddleware?: PacketMiddleware = undefined;
  toServerMiddleware?: PacketMiddleware = undefined;
  write: (name: string, data: any) => void = () => {};
  writeRaw: (buffer: any) => void = () => {};
  writeChannel: (channel: any, params: any) => void = () => {};
  constructor(botOptions: BotOptions, options?: Partial<ConnOptions>) {
    this.options = { ...new ConnOptions(), ...options };
    this.bot = createBot(botOptions) as any;
    this.bot.recipes = [];
    this.write = this.bot._client.write.bind(this.bot._client);
    this.writeRaw = this.bot._client.writeRaw.bind(this.bot._client);
    this.writeChannel = this.bot._client.writeChannel.bind(this.bot._client);
    if (options?.toClientMiddleware) this.toClientMiddleware = options.toClientMiddleware;
    if (options?.toServerMiddleware) this.toServerMiddleware = options.toServerMiddleware;
    this.bot._client.on('packet', async (data, meta) => {
      //* relay packet to all connected clients
      if (!this.options.toClientBlackList.includes(meta.name)) {
        for (const pclient of this.pclients) {
          const middleware = this.toClientMiddleware ?? pclient.toClientMiddleware ?? DefaultMiddleware
          let isCanceled = false;
          const funcReturn = middleware({ bound: 'client', meta, writeType: 'packet' }, pclient, data, () => {
            isCanceled = true;
          })
          if (funcReturn instanceof Promise) {
            await funcReturn
          }
          if (!isCanceled) pclient.write(meta.name, data);
        }
      }
      
      //* entity metadata tracking
      if (data.metadata && data.entityId && this.bot.entities[data.entityId]) (this.bot.entities[data.entityId] as any).rawMetadata = data.metadata;

      //* recipe tracking https://wiki.vg/index.php?title=Protocol&oldid=14204#Unlock_Recipes
      switch (meta.name) {
        case 'unlock_recipes':
          switch (data.action) {
            case 0: //* initialize
              this.bot.recipes = data.recipes1;
              break;
            case 1: //* add
              this.bot.recipes = [...this.bot.recipes, ...data.recipes1];
              break;
            case 2: //* remove
              this.bot.recipes = Array.from(
                (data.recipes1 as number[]).reduce((recipes, recipe) => {
                  recipes.delete(recipe);
                  return recipes;
                }, new Set(this.bot.recipes))
              );
              break;
          }
          break;
        case 'abilities':
          this.bot.physicsEnabled = !!((data.flags & 0b10) ^ 0b10);
          break;
      }
    });
    this.options.events = [...defaultEvents, ...this.options.events];
  }

  //* generates and sends packets suitable to a client
  sendPackets(pclient: Client) {
    this.generatePackets(pclient).forEach((packet) => pclient.write(...packet));
  }
  //* generates packets ([if provided] suitable to a client)
  generatePackets(pclient?: Client): Packet[] {
    return generatePackets(this.bot, pclient);
  }

  //* attaching means receiving all packets from the server
  attach(pclient: Client, options?: { toClientMiddleware?: PacketMiddleware }) {
    if (!this.pclients.includes(pclient)) {
      if (options && options.toClientMiddleware) pclient.toClientMiddleware = options.toClientMiddleware;
      this.pclients.push(pclient);
      this.options.events.map(customizeClientEvents(this, pclient)).forEach(([event, listener]) => pclient.on(event, listener));
    }
  }
  //* reverses attaching
  //* a client that isn't attached anymore will no longer receive packets from the server
  //* if the client was the main client, it will also be unlinked.
  detach(pclient: Client) {
    this.pclients = this.pclients.filter((client) => client !== pclient);
    this.options.events.map(customizeClientEvents(this, pclient)).forEach(([event, listener]) => pclient.removeListener(event, listener));
    if (this.pclient === pclient) this.unlink();
  }

  //* linking means being the main client on the connection, being able to write to the server
  //* if not previously attached, this will do so.
  link(pclient: Client, options?: { toClientMiddleware?: PacketMiddleware }) {
    this.pclient = pclient;
    this.bot._client.write = this.writeIf.bind(this);
    this.bot._client.writeRaw = () => {};
    this.bot._client.writeChannel = () => {};
    this.attach(pclient, options);
  }
  //* reverses linking
  //* doesn't remove the client from the pclients array, it is still attached
  unlink() {
    if (this.pclient) {
      this.bot._client.write = this.write.bind(this.bot._client);
      this.bot._client.writeRaw = this.writeRaw.bind(this.bot._client);
      this.bot._client.writeChannel = this.writeChannel.bind(this.bot._client);
      this.pclient = undefined;
    }
  }

  //* internal filter
  writeIf(name: string, data: any) {
    if (this.options.internalWhitelist.includes(name)) this.write(name, data);
  }
  //* disconnect from the server and ends, detaches all pclients
  disconnect() {
    this.bot._client.end('conn: disconnect called');
    this.pclients.forEach(this.detach.bind(this));
  }
}

function customizeClientEvents(conn: Conn, pclient: Client) {
  return function (clientEvent: ClientEventTuple | ((conn: Conn, pclient: Client) => ClientEventTuple)) {
    return typeof clientEvent === 'function' ? clientEvent(conn, pclient) : clientEvent;
  };
}

const defaultEvents: ClientEvents = [
  (conn, pclient) => [
    'packet',
    (data, { name }) => {
      //* check if client is authorized to modify connection (sending packets and state information from mineflayer)
      if (pclient.toServerWhiteList?.includes(name) || (conn.pclient === pclient && !(pclient.toServerBlackList ?? conn.options.toServerBlackList).includes(name))) {
        //* relay packet
        conn.write(name, data);
        //* keep mineflayer info up to date
        switch (name) {
          case 'position':
            conn.bot.entity.position.x = data.x;
            conn.bot.entity.position.y = data.y;
            conn.bot.entity.position.z = data.z;
            conn.bot.entity.onGround = data.onGround;
            break;
          case 'position_look': // FALLTHROUGH
            conn.bot.entity.position.x = data.x;
            conn.bot.entity.position.y = data.y;
            conn.bot.entity.position.z = data.z;
          case 'look':
            conn.bot.entity.yaw = ((180 - data.yaw) * Math.PI) / 180;
            conn.bot.entity.pitch = -(data.pitch * Math.PI) / 180;
            conn.bot.entity.onGround = data.onGround;
            break;
          case 'held_item_slot':
            conn.bot.quickBarSlot = data.slotId;
            break;
          case 'abilities':
            conn.bot.physicsEnabled = !!((data.flags & 0b10) ^ 0b10);
            break;
        }
      }
    },
  ],
  (conn, pclient) => ['end', () => conn.detach(pclient)],
  (conn, pclient) => ['error', () => conn.detach(pclient)],
];
