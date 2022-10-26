[![Release][release-shield]][release-link] [![Continuous Integration][ci-shield]][ci-link] [![Latest][semver-shield]][semver-link] [![Beta][beta-shield]][beta-link]

# mcproxy [WIP]

a minecraft proxy library powered by mineflayer that replicates data as well as possible from available information of mineflayer

## Contribution

This project was inspired by [2bored2wait](https://github.com/themoonisacheese/2bored2wait) and now serves as a dependency of it. This project relies heavily on the great work that the awesome people of the [PrismarineJS project](https://prismarine.js.org/) have done.

## Installation

To add this to your project, just install it with your favourite package manager.

```sh
npm install @rob9315/mcproxy
# or
yarn add @rob9315/mcproxy
# or
pnpm add @rob9315/mcproxy
```

## API

This project provides the `Conn` class, which enables you to create a connection to a server and connect clients to the Conn instance. The connection will stay after you disconnect from the Conn instance.

```ts
// How to instanciate Conn:
import { Conn } from '@rob9315/mcproxy';
const conn = new Conn(botOptions: mineflayer.BotOptions, options: ConnOptions);
```

### Types and Classes

#### `BotOptions`

The botOptions which are needed in the constructor of Conn, are the same as the ones from mineflayer itself.

#### `ConnOptions`

ConnOptions regulate Conn-specific settings.

- Object. Optional
  - `optimizePacketWrite` - Boolean. Optional. Setting for writing the received packet buffer instead off re serializing the deserialized packet. Packets that had there data changed inside the middleware are effected by this. Defaults to `true`.
  - `toClientMiddleware` - Middleware. Optional. A default to Client middleware to be attached to every client.
  - `toServerMiddleware` - Middleware. Optional. A default to Server middleware to be attached to every client.

#### `Client` | `pclient`

The Client class is the same as the minecraft-protocol client class with the one exception that it can also contain the following settings used in the Conn class to cause different behaviors.

- `toClientMiddlewares` - `Middleware[]`. To client middleware array
- `toServerMiddlewares` - `Middleware[]`. To server middleware array

#### `Packet`

A tuple consisting of the name and data of the packet. Reason for this is to be easily used with the .write function of any client.

```ts
import type { Packet } from '@rob9315/mcproxy';
const packet: Packet = ['chat', { message: 'Welcome to mcproxy!', position: 0 }];
pclient.write(...packet);
```

#### `PacketMeta`

The packet meta. Name is the packet name. State can be play or login (?).

```ts
name: string;
state: States;
```

#### `Middleware`

A function to interact with send packets between a connected client and the server.

##### Arguments:

- `info` - Object that contains meta info about the packet.
  - `bound` - String. Either `'client'` or `'server'`. Will always be the same depending on If the middleware was attached as a to Client or to Server middleware.
  - `meta` - The `PacketMeta` off the send packet.
  - `writeType` - Only `'packet'` at the moment
- `pclient` - `Client`. The client this packet belongs to or is destined to.
- `data` - The parsed packet data. See the [prismarine data](https://minecraft-data.prismarine.js.org/?d=protocol) for protocol specific packet data.
- `cancel` - The packet canceler function. If you want cancel a packet you call this function. Also has a `isCanceled` attribute to check if a packet is already canceled or not. Can be called with the first argument as `false` to revers an already set canceled attribute to un cancel a packet.
- `update` - The packet updater. If a packet has been changed this function should be called. This can be used to speed up middleware performance by only serializing packets that have been changed. Has an attribute `isUpdated` to check if the current packet will be treated as updated or not. Can be called with the first argument as `false` to revers an already set update attribute to un update a packet.

```ts
const middlewareFunction: PacketMiddleware = (info, pclient, data: any, cancel) => {
  if (cancel.isCanceled) return; // Not necessary but may improve performance when using multiple middleware's after each other
  if (info.meta.name !== 'chat') return;
  if (JSON.stringify(data.message).includes('censor')) return cancel(); // Cancel all packets that have the word censor in the chat message string
};
```

### `getLoginSequencePackets()`

```ts
import { getLoginSequencePackets } from '@rob9315/mcproxy';
let packets: Packet[] = getLoginSequencePackets(bot, pclient?: Client);
packets.forEach((packet)=>pclient.write(...packet));
```

the internal method used to generate packets from a bot and an optional pclient. If a pclient is provided some aspects of the packets are changed such as the uuid and some version specific changes might be done for compatibility (though not all versions are supported \[yet])

### `Conn.bot`

the [mineflayer Bot](https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md#bot) integrated into the library, **You cannot write with the bot's `bot._client.write()` method**, instead use the `Conn.write()` method if you need to manually send packets.

### `Conn.pclient`

The proxyClient which is able to send packets to the server. Also receives them as a part of the `Conn.pclients` array. **Do not write to this manually**

### `Conn.pclients`

An array of all proxyClients which are attached to the Connection. Use `Conn.attach()` to add a client to the array and `Conn.detach()`, they handle some more things which you'll probably want as well.

### `Conn.generatePackets()`

```ts
Conn.generatePackets(pclient?: Client): Packet[]
```

returns the generated packets for the current gamestate

### `Conn.sendPackets()`

```ts
Conn.sendPackets(pclient: Client);
```

calls `Conn.generatePackets()` and sends the result to the proxyClient specified

### `Conn.attach()`

```ts
Conn.attach(pclient: Client, options?: { toClientMiddleware?: PacketMiddleware[], toServerMiddleware?: PacketMiddleware[] })
```

- pclient - The client to be attached
- options - Optional
  - toClientMiddleware - Optional. A middleware function array to be used as this clients middle ware to the client. See middleware for a function definition.
  - toServerMiddleware - Optional. A middleware function array to be used as this clients middle ware to the server

the pclient specified will be added to the `Conn.pclients` array and the `Conn.receivingPclients`, which means that it will receive all packets from the server. If you want the client to be able to send packets to the server as well, don't forget to call `Conn.link()`

### `Conn.detach()`

```ts
Conn.detach(pclient: Client)
```

the pclient specified will be removed from the `Conn.pclients` array, meaning that it will no longer receive packets from the server. If the client was linked before, `Conn.unlink()` will also be called.

### `Conn.link()`

```ts
Conn.link(pclient: Client)
```

stops the internal bot from sending any packets to the server and starts relaying all packets from the proxyClient to the server.

### `Conn.unlink()`

```ts
Conn.unlink();
```

reverses the `link` method. The bot becomes the one to send packets to the server again.
If the proxyClient should be detached as well

### `Conn.writeIf()`

```ts
Conn.writeIf(name, data);
```

an internal method for filtering the bots Packets, can be used outside but as an API method basically useless.

### `Conn.disconnect()`

disconnects from the server and detaches all pclients

<!-- markdown links -->

[release-shield]: https://img.shields.io/github/workflow/status/rob9315/mcproxy/Release?label=Release&style=for-the-badge
[release-link]: https://github.com/rob9315/mcproxy/actions/workflows/release.yml
[ci-shield]: https://img.shields.io/github/workflow/status/rob9315/mcproxy/Continuous%20Integration?label=master&style=for-the-badge
[ci-link]: https://github.com/rob9315/mcproxy/actions/workflows/ci.yml
[npm-shield]: https://img.shields.io/github/package-json/v/rob9315/mcproxy?label=npm&style=for-the-badge
[npm-link]: https://www.npmjs.com/package/@rob9315/mcproxy
[beta-shield]: https://img.shields.io/github/v/tag/rob9315/mcproxy?include_prereleases&label=beta&sort=semver&style=for-the-badge
[beta-link]: https://www.npmjs.com/package/@rob9315/mcproxy/v/beta
[semver-shield]: https://img.shields.io/github/v/tag/rob9315/mcproxy?include_releases&label=latest&sort=semver&style=for-the-badge
[semver-link]: https://www.npmjs.com/package/@rob9315/mcproxy
