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
