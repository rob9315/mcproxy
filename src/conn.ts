import { Bot, BotOptions, createBot } from 'mineflayer';
import { Client as mcpClient, PacketMeta } from 'minecraft-protocol';
import { createClient } from 'minecraft-protocol';
import { states } from 'minecraft-protocol';
import { getLoginSequencePackets } from './packets';
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
  //* Middleware to control packets being send to the client and server
  toClientMiddleware?: PacketMiddleware[] = [() => {}];
  //* Middleware to control packets being send to the client and server
  toServerMiddleware?: PacketMiddleware[] = [() => {}];
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

/**
 * Middleware manager for packets. Used to modify cancel or delay packets being send to the client or server.
 */
export interface PacketMiddleware {
  /** Contains meta information about the packet that is triggered. See the properties for more info. */
  (
    info: {
      /** Direction the packet is going. Should always be the same direction depending on what middleware direction you
       * are registering.
       */
      bound: 'server' | 'client';
      /** Only 'packet' is implemented */
      writeType: 'packet' | 'rawPacket' | 'channel';
      /** Packet meta. Contains the packet name under `name` also see {@link PacketMeta} */
      meta: PacketMeta;
    },
    /** The client connected to this packet */ pclient: Client,
    /** Parsed packet data as returned by nmp */ data: any,
    /** A handle to cancel a packet from being send. Can also force a packet to be send */ cancel: PacketCanceler,
    /** Indicate that a packet has been modified */ update: packetUpdater
  ): void | Promise<void>;
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
  pclient: Client,
  /** Parsed packet data as returned by nmp */
  data: any,
  /** A handle to cancel a packet from being send. Can also force a packet to be send */
  cancel: PacketCanceler,
  /** Indicate that a packet has been modified */
  update: packetUpdater
}

export interface PacketMiddleware2 {
  (packetData: PacketData): PacketData | Promise<PacketData>
}

export class Conn {
  options: ConnOptions;
  stateData: StateData
  client: mcpClient
  /** Internal whitelist for the bot */
  // private internalWhitelist: string[] = ['keep_alive'];
  optimizePacketWrite: boolean = true;
  /** Contains the currently writing client or undefined if there is none */
  writingClient: Client | undefined;
  /** Contains clients that are actively receiving packets from the proxy bot */
  receivingClients: Client[] = [];
  toClientDefaultMiddleware?: PacketMiddleware[] = undefined;
  toServerDefaultMiddleware?: PacketMiddleware[] = undefined;
  serverToBotDefaultMiddleware: PacketMiddleware
  botToServerDefaultMiddleware: PacketMiddleware
  write: (name: string, data: any) => void;
  writeRaw: (buffer: any) => void;
  writeChannel: (channel: any, params: any) => void;
  constructor(botOptions: BotOptions, options?: Partial<ConnOptions>) {
    this.options = { ...new ConnOptions(), ...options };
    this.client = createClient(botOptions)
    this.stateData = new StateData(createBot({ ...botOptions, client: this.client }))
    this.receivingClients = [];
    this.serverToBotDefaultMiddleware = this.getServerToBotMiddleware()
    this.botToServerDefaultMiddleware = this.getBotToServerMiddleware()
    this.write = this.client.write.bind(this.client);
    this.writeRaw = this.client.writeRaw.bind(this.client);
    this.writeChannel = this.client.writeChannel.bind(this.client);
    this.optimizePacketWrite = this.options.optimizePacketWrite;
    if (options?.toClientMiddleware) this.toClientDefaultMiddleware = options.toClientMiddleware;
    if (options?.toServerMiddleware) this.toServerDefaultMiddleware = options.toServerMiddleware;

    // this.internalWhitelist = ['keep_alive'];

    this.client.on('raw', this.onServerRaw.bind(this))
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
    // @ts-ignore-error
    const packetData = this.bot._client.deserializer.parsePacketBuffer(buffer).data.params;
    //* keep mineflayer info up to date
    switch (meta.name) {
      case 'abilities':
        this.stateData.bot.physicsEnabled = !this.writingClient && !!((packetData.flags & 0b10) ^ 0b10);
      default: // Fallthrough
        this.stateData.onSToCPacket(meta.name, packetData)
    }
    for (const pclient of this.receivingClients) {
      if (pclient.state !== states.PLAY || meta.state !== states.PLAY) {
        continue;
      }
      // Build packet canceler function used by middleware
      const cancel: PacketCanceler = Object.assign(
        (unCancel: boolean = false) => {
          cancel.isCanceled = unCancel ? false : true;
          update.isUpdated = true;
        },
        { isCanceled: false }
      );
      const update: packetUpdater = Object.assign(
        (unUpdate: boolean = false) => {
          update.isUpdated = !unUpdate;
        },
        { isUpdated: false }
      );

      for (const middleware of pclient.toClientMiddlewares) {
        const funcReturn = middleware({ bound: 'client', meta, writeType: 'packet' }, pclient, packetData, cancel, update);
        if (funcReturn instanceof Promise) {
          await funcReturn;
        }
      }
      // TODO: figure out what packet is breaking crafting on 2b2t
      // Hint: It is the recipes unlock packet that is send when crafting an item.
      // Probably some bad unlocked recipes packet reconstruction on login that is causing packets send after to crash the client.

      if (cancel.isCanceled !== false) continue;
      if (!update.isUpdated && this.optimizePacketWrite) {
        pclient.writeRaw(buffer);
        continue;
      }
      pclient.write(meta.name, packetData);
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
      // Build packet canceler function used by middleware
      const cancel: PacketCanceler = Object.assign(
        (unCancel: boolean = false) => {
          cancel.isCanceled = unCancel ? false : true;
          update.isUpdated = true;
        },
        { isCanceled: false }
      );
      const update: packetUpdater = Object.assign(
        (unUpdate: boolean = false) => {
          update.isUpdated = !unUpdate;
        },
        { isUpdated: false }
      );

      for (const middleware of pclient.toServerMiddlewares) {
        const funcReturn = middleware({ bound: 'server', meta, writeType: 'packet' }, pclient, data, cancel, update);
        if (funcReturn instanceof Promise) {
          await funcReturn;
        }
      }
      if (cancel.isCanceled !== false) return;
      if (!update.isUpdated && this.optimizePacketWrite) {
        this.writeRaw(buffer);
        return;
      }
      this.write(meta.name, data);
    };
    handle().catch(console.error);
  }

  /**
   * Register middleware to be used as client to server middleware.
   * @param pclient Client
   */
  private serverClientDefaultMiddleware(pclient: Client) {
    if (!pclient.toClientMiddlewares) pclient.toClientMiddlewares = [];
    const _internalMcProxyServerClient: PacketMiddleware = (info, pclient, data, cancel, update) => {
      if (!this.receivingClients.includes(pclient)) return cancel();
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
    const _internalMcProxyClientServer: PacketMiddleware = (info, pclient, data: any, cancel) => {
      if (info.meta.state !== 'play') return cancel();
      if (info.meta.name === 'teleport_confirm' && data?.teleportId === 0) {
        pclient.write('position', {
          ...this.stateData.bot.entity.position,
          yaw: 180 - (this.stateData.bot.entity.yaw * 180) / Math.PI,
          pitch: -(this.stateData.bot.entity.pitch * 180) / Math.PI,
          teleportId: 1,
        });
        cancel();
      }
      //* check if client is authorized to modify connection (sending packets and state information from mineflayer)
      if (this.writingClient !== pclient) {
        return cancel();
      }
      // Keep the bot updated
      // Note: Packets seam to be the exact same going from server to client and the other way around.
      // At least for 1.12.2. So this is just copy past from onServerRaw
      switch (info.meta.name) {
        case 'abilities':
          this.stateData.bot.physicsEnabled = !this.writingClient && !!((data.flags & 0b10) ^ 0b10);
          break;
        default:
          this.stateData.onCToSPacket(info.meta.name, data)
      }
      if (info.meta.name === 'keep_alive') cancel(); // Already handled by the bot client
    };
    pclient.toServerMiddlewares.push(_internalMcProxyClientServer.bind(this));
    if (this.toServerDefaultMiddleware) pclient.toServerMiddlewares.push(...this.toServerDefaultMiddleware);
  }

  private getBotToServerMiddleware(): PacketMiddleware {
    const packetWhitelist = ['keep_alive'] // Packets that are send to the server even tho the bot is not controlling
    return (info, pclient, data, cancel, update) => {
      if (packetWhitelist.includes(info.meta.name)) return
      if (this.writingClient) { // If there is a writing client cancel all packets
        cancel()
        return
      }
    }
  }

  private getServerToBotMiddleware(): PacketMiddleware {
    return (info, pclient, data, cancel, update) => {
      // Do not cancel on incoming packets to keep the bot updated
    }
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
    return getLoginSequencePackets(this.stateData, pclient);
  }

  /**
   * Attaches a client to the proxy. Attaching means receiving all packets from the server. Takes middleware handlers
   * as an optional argument to be used for the client.
   * @param pclient
   * @param options
   */
  attach(pclient: Client, options?: { toClientMiddleware?: PacketMiddleware[]; toServerMiddleware?: PacketMiddleware[] }) {
    if (!this.receivingClients.includes(pclient)) {
      this.clientServerDefaultMiddleware(pclient);
      this.serverClientDefaultMiddleware(pclient);
      this.receivingClients.push(pclient);
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
    this.receivingClients = this.receivingClients.filter((c) => c !== pClient);
    pClient.emit('mcproxy:detach');
    if (this.writingClient === pClient) this.unlink();
  }

  /**
   * Linking means being the one client on the connection that is able to write to the server replacing the bot or other
   * connected clients that are currently writing.
   * If not previously attached, this will do so.
   * @param pClient Client to link
   * @param options Extra options like extra middleware to be used for the client.
   */
  link(pClient: Client, options?: { toClientMiddleware?: PacketMiddleware[] }) {
    if (this.writingClient) this.unlink(); // Does this even matter? Maybe just keep it for future use when unlink does more.
    this.writingClient = pClient;
    this.stateData.bot.physicsEnabled = false
    // this.bot._client.write = this.writeIf.bind(this);
    // this.bot._client.writeRaw = () => {};
    // this.bot._client.writeChannel = () => {};
    this.attach(pClient, options);
  }

  /**
   * Reverse linking.
   * Doesn't remove the client from the receivingClients array, it is still attached.
   */
  unlink() {
    if (this.writingClient) {
      this.stateData.bot.physicsEnabled = true
      // this.bot._client.write = this.write.bind(this.bot._client);
      // this.bot._client.writeRaw = this.writeRaw.bind(this.bot._client);
      // this.bot._client.writeChannel = this.writeChannel.bind(this.bot._client);
      this.writingClient = undefined;
    }
  }

  //* internal filter
  async writeIf(name: string, data: any) {
    // if (this.internalWhitelist.includes(name)) this.write(name, data);

    const state = this.stateData.bot._client.state
    // Build packet canceler function used by middleware
    const cancel: PacketCanceler = Object.assign(
      (unCancel: boolean = false) => {
        cancel.isCanceled = unCancel ? false : true;
        update.isUpdated = true;
      },
      { isCanceled: false }
    );
    const update: packetUpdater = Object.assign(
      (unUpdate: boolean = false) => {
        update.isUpdated = !unUpdate;
      },
      { isUpdated: false }
    );

    // @ts-ignore
    const funcReturn = this.botToServerDefaultMiddleware({ bound: 'client', meta: { state, name }, writeType: 'packet' }, null, data, cancel, update);
    if (funcReturn instanceof Promise) {
      await funcReturn;
    }

    if (cancel.isCanceled !== false) return;
    this.write(name, data);
  }
  //* disconnect from the server and ends, detaches all pclients
  disconnect() {
    this.stateData.bot._client.end('conn: disconnect called');
    this.receivingClients.forEach(this.detach.bind(this));
  }
}
