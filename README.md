[![Release][release-shield]][release-link] [![Continuous Integration][ci-shield]][ci-link] [![Latest][semver-shield]][semver-link] [![Beta][beta-shield]][beta-link]

# mcproxy

a minecraft proxy library powered by mineflayer that replicates data as well as possible from available information of mineflayer

## Contribution

This project was inspired by [2bored2wait](https://github.com/themoonisacheese/2bored2wait) and now serves as a dependency of it. This project relies heavily on the great work that the awesome people of the [PrismarineJS project](https://prismarine.js.org/) have done.

## API

This project provides the `Conn` class, which enables you to create a connection to a server and connect clients to the Conn instance. The connection will stay after you disconnect from the Conn instance.

```ts
// How to instanciate Conn:
import { Conn } from "@rob9315/mcproxy";
const conn = new Conn(botOptions: mineflayer.BotOptions, relayExcludedPacketNames?: string[], options: ConnOptions);
```

### `Conn.bot`

`Conn.bot` is the mineflayer [Bot](https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md#bot) integrated into the library

### `Conn.pclient`

This should not be overwritten, there is a method to change this property. It is the proxyClient that packets are being relayed to. To attach a client, use `Conn.link`.

### `Conn.excludedPacketNames`

the array one can set at creation of the conn object, can be changed at runtime after being instanciated, (though shouldn't be).

### `Conn.generatePackets()`

```ts
Conn.generatePackets(): Packet[]
```

returns the generated packets for the current gamestate

### `Conn.sendPackets()`

```ts
Conn.sendPackets(pclient)
```

this method calls `Conn.generatePackets()` and sends the packets to the proxyClient specified

### `Conn.link()`

```ts
Conn.link(pclient)
```

this method stops the internal bot from sending any packets to the server and starts relaying all packets to the proxyClient as well as sending the packets from the proxyClient to the server.

### `Conn.unlink()`

```ts
Conn.unlink(pclient)
```

this method removes the proxyClient linked by the `.link()` method and cleans up afterwards

### `Conn.writeIf()`

```ts
Conn.writeIf(name, data)
```

this is an internal method for filtering Packets, can be used outside but is mostly not necessary to use

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