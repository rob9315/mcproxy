[![Release][release-shield]][release-link] [![Continuous Integration][ci-shield]][ci-link] [![Latest][semver-shield]][semver-link] [![Beta][beta-shield]][beta-link]

# mcproxy [WIP]

a minecraft proxy library powered by mineflayer that replicates data as well as possible from available information of mineflayer

# Contribution

This project was inspired by [2bored2wait](https://github.com/themoonisacheese/2bored2wait) and now serves as a dependency of it. This project relies heavily on the great work that the awesome people of the [PrismarineJS project](https://prismarine.js.org/) have done.

# Installation

To add this to your project, just install it with your favourite package manager.

```sh
npm install @rob9315/mcproxy
# or
yarn add @rob9315/mcproxy
# or
pnpm add @rob9315/mcproxy
```

It is recommended to use yarn for this project. Altho other package managers should work too.

# API

This project provides the `Conn` class, which enables you to create a connection to a server and connect clients to the Conn instance. The connection will stay after you disconnect from the Conn instance.

```ts
// How to instanciate Conn:
import { Conn } from '@rob9315/mcproxy';
const conn = new Conn(botOptions: mineflayer.BotOptions, options: ConnOptions);
```

## Types and Classes

### Interface `BotOptions`

The botOptions which are needed in the constructor of Conn, are the same as the ones from mineflayer itself.

### Interface `ConnOptions`

ConnOptions regulate Conn-specific settings.

- Object. Optional
  - `optimizePacketWrite` - Boolean. Optional. Setting for writing the received packet buffer instead off re serializing the deserialized packet. Packets that had there data changed inside the middleware are effected by this. Defaults to `true`.
  - `toClientMiddleware` - [Middleware](#middleware). Optional. A default to Client middleware to be attached to every client.
  - `toServerMiddleware` - [Middleware](#middleware). Optional. A default to Server middleware to be attached to every client.

### `Client` | `pclient`

The Client class is the same as the minecraft-protocol client class with the one exception that it can also contain the following settings used in the Conn class to cause different behaviors.

- `toClientMiddlewares` - `Middleware[]`. To client [Middleware](#middleware) array
- `toServerMiddlewares` - `Middleware[]`. To server [Middleware](#middleware) array

### `Middleware`

A function to interact with send packets between a connected client and the server. The middleware function should return different values depending on what should be done with the packet:

- Changing packets: Return the new packet data
- Canceling the packet: Return `false`
- Do nothing: Return `undefined`

The returned value can also be wrapped in a promise. The middleware will await the promise result before continuing to process the packet.

#### Middleware Arguments:

- `data` - Object that contains the packet in transit
  - `bound` - Either `server` or `client`. The direction the packet is traveling in.
  - `writeType` - At the moment only `packet`. The type off the packet in transit.
  - `meta` - Object of Packet meta
    - `name` - Packet name
    - `state` - Packet state
  - `pclient` - The client connected to this packet. Either the client sending the packet or undefined if the packet is send by the server
  - `data` - Parsed packet data
  - `isCanceled` - Boolean if the packet has already been canceled or not

```ts
const middlewareFunction: PacketMiddleware = ({ meta, isCanceled }) => {
  if (isCanceled) return; // Not necessary but may improve performance when using multiple middleware's after each other
  if (meta.name !== 'chat') return; // Returns undefined so the packet is not affected
  if (data.message.includes('censor')) return false; // Cancel all packets that have the word censor in the chat message string
};
```

### Class `StateData`

State Keeping class to extend prismarine-worlds missing state keeping information. Also holds the bot reference.

- `recipes` - `number[]` Used to keep track off recipes
- `flying` - `boolean` Used to keep track off if the proxy should be flying or not
- `bot` - Bot. A mineflayer bot instance attached to the connection.

### `generatePackets(stateData: StateData, pclient?: Client)`

- `stateData` - Instance off [`StateData`](#class-statedata)
- `pclient` - The pclient to generate data for

The internal method used to generate packets from a bot and an optional pclient. If a pclient is provided some aspects of the packets are changed such as the uuid and some version specific changes might be done for compatibility (though not all versions are supported \[yet])

```ts
import { generatePackets } from '@rob9315/mcproxy';
let packets: Packet[] = generatePackets(bot, pclient?: Client);
packets.forEach((packet)=>pclient.write(...packet));
```

### `Conn.bot`

The [mineflayer Bot](https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md#bot) integrated into the library, **You cannot write with the bot's `bot._client.write()` method**, instead use the [`Conn.write()`](#connwriteif) method if you need to manually send packets.

### `Conn.pclient`

The proxyClient which is able to send packets to the server. Also receives them as a part of the `Conn.pclients` array. **Do not write to this manually**

### `Conn.pclients`

An array of all proxyClients which are attached to the Connection. Use [`Conn.attach()`](#connattach) to add a client to the array and `Conn.detach()`, they handle some more things which you'll probably want as well.

### `Conn.generatePackets(pclient?: Client)`

- `pclient` - Optional. Client to specify uuid and entity id when generating packets.

Returns the generated packets for the current gamestate

```ts
Conn.generatePackets(pclient?: Client): Packet[]
```

### `Conn.sendPackets(pclient: Client)`

- `pclient` - The client to send the packets to

Calls `Conn.generatePackets()` and sends the result to the proxyClient specified

```ts
Conn.sendPackets(pclient: Client);
```

### `Conn.attach(pclient: Client, options?)`

The pclient specified will be added to the `Conn.pclients` array and the `Conn.receivingPclients`, which means that it will receive all packets from the server. If you want the client to be able to send packets to the server as well, don't forget to call `Conn.link()`

- `pclient` - The client to be attached
- `options` - Optional. Object.
  - toClientMiddleware - Optional. A middleware function array to be used as this clients middle ware to the client. See middleware for a function definition.
  - toServerMiddleware - Optional. A middleware function array to be used as this clients middle ware to the server

```ts
Conn.attach(pclient: Client, options?: { toClientMiddleware?: PacketMiddleware[], toServerMiddleware?: PacketMiddleware[] })
```

### `Conn.detach(pclient: Client)`

The pclient specified will be removed from the `Conn.pclients` array, meaning that it will no longer receive packets from the server. If the client was linked before, `Conn.unlink()` will also be called.

- `pclient` - The client to detach.

```ts
Conn.detach(pclient: Client)
```

### `Conn.link()`

Stops the internal bot from sending any packets to the server and starts relaying all packets from the proxyClient to the server.

```ts
Conn.link(pclient: Client)
```

### `Conn.unlink()`

Reverses the `link` method. The bot becomes the one to send packets to the server again.
If the proxyClient should be detached as well

```ts
Conn.unlink();
```

### `Conn.writeIf()`

An internal method for filtering the bots Packets, can be used outside but as an API method basically useless.

```ts
Conn.writeIf(name, data);
```

### `Conn.disconnect()`

Disconnects from the server and detaches all pclients

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
