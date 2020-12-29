# mcproxy

A wrapper for mineflayer able to generate packets for actual minecraft clients to connect to

This project includes a working proxy server that manages the Proxy-Connections with its own ingame command set

## Contribution

This Project is based on the [PrismarineJS project](https://prismarine.js.org/) and inspired by the [2bored2wait project](https://github.com/themoonisacheese/2bored2wait), but completely seperate, which is why it isn't a fork. If you want to contribute, the project is written in TypeScript and of course OpenSource so either tinker with it yourself or if you have ideas, [open an issue](https://github.com/Rob9315/mcproxy/issues/new)

## ProxyServer Easy setup

have the dependent program: nodejs (and npm)

download the project with git

```shell
git clone github.com/Rob9315/mcproxy.git
```

or the raw zip

then open a terminal in your folder and run

```shell
npm start
```

to start the proxy server.

connect with your preferred minecraft client to

```
localhost:25566
```

and use the appropriate [commands](https://github.com/Rob9315/mcproxy/blob/master/COMMANDS.md) via the ingame chat

## API

The API exposes two objects to other programs. One is the `Conn()` class to build your own proxy /proxy management system on top and the other is the `ProxyServer()` class to deploy this Proxy Server with your own configuration.

### `Conn`

```ts
new Conn(botOptions, relayExcludedPacketNames?)
```

you can instantiate the Conn to deploy a new Bot to connect to a server. it takes mineflayer's [botOptions](https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md#mineflayercreatebotoptions) and a list of packets to exclude sending, in the integrated ProxyServer this is the `chat` and the `keep_alive` packet. they are not sent to the server if received.

#### `.bot`

is the mineflayer [Bot](https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md#bot) integrated into the proxy

#### `.pclient`

this should written to, as there is a method to change this attribute. it is the proxyClient that is being relayed every packet

#### `.excludedPacketNames`

the array one can set at creation of the conn object, can be changed at runtime

#### `.sendPackets()`

```ts
.sendPackets(pclient)
```

this method generates packets to recreate the current gamestate and sends them to the proxyClient specified

#### `.generatePackets()`

```ts
.generatePackets():Packet[]
```

returns the generated packets of the current gamestate

#### `.link()`

```ts
.link(pclient)
```

this method stops the internal bot from sending any packets to the server and starts relaying all packets to the proxyClient as well as relaying packets from the proxyClient.

#### `.unlink()`

```ts
.unlink(pclient)
```

this method removes links by the `.link()` method and cleans up afterwards

#### `.writeIf()`

```ts
.writeIf(name, data)
```

this is an internal method for filtering Packets, can be used outside but is mostly not necessary

### `ProxyServer`

```ts
new ProxyServer(proxyServerOptions);
```

ProxyServer is the complete Proxy Management Server Class included with demo options in this repo. It is built on top on a normal minecraft-protocol [Server](https://github.com/PrismarineJS/node-minecraft-protocol/blob/master/docs/API.md#mcserverversioncustompackets) but takes the [serverOptions](https://github.com/PrismarineJS/node-minecraft-protocol/blob/master/docs/API.md#mccreateserveroptions) directly as constructor input. The ProxyServer works autonomously, methods are still exposed if required can be tinkered with but generally shouldn't.
