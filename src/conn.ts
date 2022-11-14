import { Bot, BotOptions, createBot } from 'mineflayer';
import { Client as mcpClient, PacketMeta } from 'minecraft-protocol';
import { createClient } from 'minecraft-protocol';
import { states } from 'minecraft-protocol';
import { generatePackets } from './packets';
import { StateData } from './stateData';
const bufferEqual = require('buffer-equal');

export type Packet = [name: string, data: any];

export type ClientEventTuple = [event: string, listener: (...args: any) => void];
export type ClientEvents = (ClientEventTuple | ((conn: Conn, pclient: Client) => ClientEventTuple))[];

export type Client = mcpClient & {
  toClientMiddlewares: PacketMiddleware[];
  toServerMiddlewares: PacketMiddleware[];

  on(event: 'mcproxy:detach', listener: () => void): void;
  on(event: 'mcproxy:heldItemSlotUpdate', listener: () => void): void;
};

export class ConnOptions {
  optimizePacketWrite: boolean = true;
  //* Middleware to control packets being sent from the server to the client
  toClientMiddleware?: PacketMiddleware[] = [];
  //* Middleware to control packets being sent from the client to the server
  toServerMiddleware?: PacketMiddleware[] = [];
}

export interface PacketCanceler {
  /** Has property .isCanceled: boolean indicating if the packet has been canceled by another middleware.
   * Use `cancel(false)` to un-cancel the packet again.
   */
  (unCancel?: boolean): void;
  isCanceled: boolean;
}

export interface packetUpdater {
  (update?: boolean): void;
  isUpdated: boolean;
}

interface PacketData {
  /** Direction the packet is going. Should always be the same direction depending on what middleware direction you
   * are registering.
   */
  bound: 'server' | 'client';
  /** Only 'packet' is implemented */
  writeType: 'packet' | 'rawPacket' | 'channel';
  /** Packet meta. Contains the packet name under `name` also see {@link PacketMeta} */
  meta: PacketMeta;
  /** The client connected to this packet */
  pclient: Client | null;
  /** Parsed packet data as returned by nmp */
  data: any;
  /** Indicator if the packet is canceled or not */
  isCanceled: boolean;
}

export interface PacketMiddleware {
  (packetData: PacketData): PacketMiddlewareReturnValue | Promise<PacketMiddlewareReturnValue>;
}

type PacketMiddlewareReturnValue = PacketData | undefined | false;

export class Conn {
  options: ConnOptions;
  stateData: StateData;
  client: mcpClient;
  /** @deprecated Use `Conn.stateData.bot` instead */
  bot: Bot;
  /** Internal whitelist for the bot */
  // private internalWhitelist: string[] = ['keep_alive'];
  optimizePacketWrite: boolean = true;
  /** Contains the currently writing client or undefined if there is none */
  pclient: Client | undefined;
  /** Contains clients that are actively receiving packets from the proxy bot */
  pclients: Client[] = [];
  toClientDefaultMiddleware?: PacketMiddleware[] = undefined;
  toServerDefaultMiddleware?: PacketMiddleware[] = undefined;
  serverToBotDefaultMiddleware: PacketMiddleware;
  botToServerDefaultMiddleware: PacketMiddleware;
  write: (name: string, data: any) => void;
  writeRaw: (buffer: any) => void;
  writeChannel: (channel: any, params: any) => void;
  constructor(botOptions: BotOptions, options?: Partial<ConnOptions>) {
    this.options = { ...new ConnOptions(), ...options };
    this.client = createClient(botOptions);
    this.bot = createBot({ ...botOptions, client: this.client });
    this.stateData = new StateData(this.bot);
    this.pclients = [];
    this.serverToBotDefaultMiddleware = this.getServerToBotMiddleware();
    this.botToServerDefaultMiddleware = this.getBotToServerMiddleware();
    this.write = this.client.write.bind(this.client);
    this.writeRaw = this.client.writeRaw.bind(this.client);
    this.writeChannel = this.client.writeChannel.bind(this.client);
    this.optimizePacketWrite = this.options.optimizePacketWrite;
    if (options?.toClientMiddleware) this.toClientDefaultMiddleware = options.toClientMiddleware;
    if (options?.toServerMiddleware) this.toServerDefaultMiddleware = options.toServerMiddleware;

    // this.internalWhitelist = ['keep_alive'];

    this.client.on('raw', this.onServerRaw.bind(this));
    // this.bot._client.on('raw', this.onServerRaw.bind(this));
  }

  /**
   * Called when the proxy bot receives a packet from the server. Forwards the packet to all attached and receiving clients taking
   * attached middleware's into account.
   * @param buffer Buffer
   * @param meta
   * @returns
   */
  async onServerRaw(buffer: Buffer, meta: PacketMeta) {
    if (meta.state !== 'play') return;

    let _packetData: any | undefined = undefined;
    const getPacketData = () => {
      if (!_packetData) {
        _packetData = this.client.deserializer.parsePacketBuffer(buffer).data.params;
      }
      return _packetData;
    };

    //* keep mineflayer info up to date
    switch (meta.name) {
      case 'abilities':
        let packetData = getPacketData();
        this.stateData.flying = !!((packetData.flags & 0b10) ^ 0b10);
        this.stateData.bot.physicsEnabled = !this.pclient && this.stateData.flying;
    }
    for (const pclient of this.pclients) {
      if (pclient.state !== states.PLAY || meta.state !== states.PLAY) {
        continue;
      }

      let packetData: PacketData = {
        bound: 'client',
        meta,
        writeType: 'packet',
        pclient,
        data: {},
        isCanceled: false,
      };
      let wasChanged = false;
      let isCanceled = false;
      Object.defineProperties(packetData, {
        data: {
          get: () => {
            wasChanged = true;
            return getPacketData();
          },
        },
        isCanceled: {
          get: () => {
            return isCanceled;
          },
        },
      });
      let currentData: PacketData = packetData;

      for (const middleware of pclient.toClientMiddlewares) {
        let data: PacketMiddlewareReturnValue;
        const funcReturn = middleware(currentData);
        if (funcReturn instanceof Promise) {
          data = await funcReturn;
        } else {
          data = funcReturn;
        }
        isCanceled = data === false;
        if (data !== undefined && data !== false) {
          currentData = data;
        }
      }
      if (isCanceled) continue;
      if (!wasChanged && this.optimizePacketWrite) {
        pclient.writeRaw(buffer);
        continue;
      }
      pclient.write(meta.name, currentData);
    }
  }

  /**
   * Handles packets send by a client to a server taking attached middleware's into account.
   * @param data Packet data
   * @param meta Packet Meta
   * @param pclient Sending Client
   */
  onClientPacket(data: any, meta: PacketMeta, buffer: Buffer, pclient: Client) {
    if (meta.state !== 'play') return;
    const handle = async () => {
      let packetData: PacketData = {
        bound: 'server',
        meta,
        writeType: 'packet',
        pclient,
        data,
        isCanceled: false,
      };
      let wasChanged = false;
      let isCanceled = false;
      let currentData: PacketData = {
        ...packetData,
      };
      Object.defineProperties(packetData, {
        data: {
          get: () => {
            wasChanged = true;
            return data;
          },
        },
        isCanceled: {
          get: () => {
            return isCanceled;
          },
        },
      });

      for (const middleware of pclient.toServerMiddlewares) {
        let data: PacketMiddlewareReturnValue;
        const funcReturn = middleware(currentData);
        if (funcReturn instanceof Promise) {
          data = await funcReturn;
        } else {
          data = funcReturn;
        }
        isCanceled = data === false;
        if (data !== undefined && data !== false) {
          currentData = data;
        }
      }
      if (isCanceled) return;
      if (!wasChanged && this.optimizePacketWrite) {
        this.writeRaw(buffer);
        return;
      }
      this.write(meta.name, packetData);
    };
    handle().catch(console.error);
  }

  /**
   * Register middleware to be used as client to server middleware.
   * @param pclient Client
   */
  private serverClientDefaultMiddleware(pclient: Client) {
    if (!pclient.toClientMiddlewares) pclient.toClientMiddlewares = [];
    const _internalMcProxyServerClient: PacketMiddleware = () => {
      if (!this.pclients.includes(pclient)) return false;
    };
    pclient.toClientMiddlewares.push(_internalMcProxyServerClient);
    if (this.toClientDefaultMiddleware) pclient.toClientMiddlewares.push(...this.toClientDefaultMiddleware);
  }

  /**
   * Register the default (first) middleware used to control what client can interact with the current bot.
   * @param pclient Client
   */
  private clientServerDefaultMiddleware(pclient: Client) {
    if (!pclient.toServerMiddlewares) pclient.toServerMiddlewares = [];
    const _internalMcProxyClientServer: PacketMiddleware = ({ meta, data }) => {
      if (meta.state !== 'play') return false;
      if (meta.name === 'teleport_confirm' && data?.teleportId === 0) {
        pclient.write('position', {
          ...this.stateData.bot.entity.position,
          yaw: 180 - (this.stateData.bot.entity.yaw * 180) / Math.PI,
          pitch: -(this.stateData.bot.entity.pitch * 180) / Math.PI,
          teleportId: 1,
        });
        return false;
      }
      //* check if client is authorized to modify connection (sending packets and state information from mineflayer)
      if (this.pclient !== pclient) {
        return false;
      }
      // Keep the bot updated from packets that are send by the controlling client to the server
      this.stateData.onCToSPacket(meta.name, data);
      if (meta.name === 'keep_alive') return false; // Already handled by the bot client
    };
    pclient.toServerMiddlewares.push(_internalMcProxyClientServer.bind(this));
    if (this.toServerDefaultMiddleware) pclient.toServerMiddlewares.push(...this.toServerDefaultMiddleware);
  }

  private getBotToServerMiddleware(): PacketMiddleware {
    const packetWhitelist = ['keep_alive']; // Packets that are send to the server even tho the bot is not controlling
    return ({ meta }) => {
      if (packetWhitelist.includes(meta.name)) return undefined;
      return this.pclient === undefined ? undefined : false;
    };
  }

  private getServerToBotMiddleware(): PacketMiddleware {
    return () => {
      // Do not cancel on incoming packets to keep the bot updated
      return undefined;
    };
  }

  /**
   * Send all packets to a client that are required to login to a server.
   * @param pclient
   */
  sendPackets(pclient: Client) {
    this.generatePackets(pclient).forEach((packet) => pclient.write(...packet));
  }

  /**
   * Generate the login sequence off packets for a client from the current bot state. Can take the client as an optional
   * argument to customize packets to the client state like version but is not used at the moment and defaults to 1.12.2
   * generic packets.
   * @param pclient Optional. Does nothing.
   */
  generatePackets(pclient?: Client): Packet[] {
    return generatePackets(this.stateData, pclient);
  }

  /**
   * Attaches a client to the proxy. Attaching means receiving all packets from the server. Takes middleware handlers
   * as an optional argument to be used for the client.
   * @param pclient
   * @param options
   */
  attach(pclient: Client, options?: { toClientMiddleware?: PacketMiddleware[]; toServerMiddleware?: PacketMiddleware[] }) {
    if (!this.pclients.includes(pclient)) {
      this.clientServerDefaultMiddleware(pclient);
      this.serverClientDefaultMiddleware(pclient);
      this.pclients.push(pclient);
      const packetListener = (data: any, meta: PacketMeta, buffer: Buffer) => this.onClientPacket(data, meta, buffer, pclient);
      const cleanup = () => {
        pclient.removeListener('packet', packetListener);
      };
      pclient.on('packet', packetListener);
      pclient.once('mcproxy:detach', () => cleanup());
      pclient.once('end', () => {
        cleanup();
        this.detach(pclient);
      });
      if (options?.toClientMiddleware) pclient.toClientMiddlewares.push(...options.toClientMiddleware);
      if (options?.toServerMiddleware) {
        pclient.toServerMiddlewares.push(...options.toServerMiddleware);
      }
    }
  }

  /**
   * Reverse attaching
   * a client that isn't attached anymore will no longer receive packets from the server.
   * if the client was the writing client, it will also be unlinked.
   * @param pClient Client to detach
   */
  detach(pClient: Client) {
    this.pclients = this.pclients.filter((c) => c !== pClient);
    pClient.emit('mcproxy:detach');
    if (this.pclient === pClient) this.unlink();
  }

  /**
   * Linking means being the one client on the connection that is able to write to the server replacing the bot or other
   * connected clients that are currently writing.
   * If not previously attached, this will do so.
   * @param pClient Client to link
   * @param options Extra options like extra middleware to be used for the client.
   */
  link(pClient: Client, options?: { toClientMiddleware?: PacketMiddleware[] }) {
    if (this.pclient) this.unlink(); // Does this even matter? Maybe just keep it for future use when unlink does more.
    this.pclient = pClient;
    this.stateData.bot.physicsEnabled = false;
    this.client.write = this.writeIf.bind(this);
    this.client.writeRaw = () => {};
    this.client.writeChannel = () => {};
    this.attach(pClient, options);
  }

  /**
   * Reverse linking.
   * Doesn't remove the client from the receivingClients array, it is still attached.
   */
  unlink() {
    if (this.pclient) {
      this.stateData.bot.physicsEnabled = this.stateData.flying;
      this.client.write = this.write.bind(this.client);
      this.client.writeRaw = this.writeRaw.bind(this.client);
      this.client.writeChannel = this.writeChannel.bind(this.client);
      this.pclient = undefined;
    }
  }

  //* internal filter
  async writeIf(name: string, packetData: any) {
    // if (this.internalWhitelist.includes(name)) this.write(name, data);

    const state = this.client.state;
    // Build packet canceler function used by middleware

    let data: PacketMiddlewareReturnValue = packetData;
    const funcReturn = this.botToServerDefaultMiddleware({ bound: 'server', meta: { state, name }, writeType: 'packet', data: packetData, pclient: null, isCanceled: false });
    if (funcReturn instanceof Promise) {
      data = await funcReturn;
    } else {
      data = funcReturn;
    }
    const isCanceled = data === false;
    if (isCanceled) return;

    if (data === undefined) {
      this.write(name, packetData);
    } else {
      this.write(name, data);
    }
  }
  //* disconnect from the server and ends, detaches all pclients
  disconnect() {
    this.stateData.bot._client.end('conn: disconnect called');
    this.pclients.forEach(this.detach.bind(this));
  }
}
