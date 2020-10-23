# prismarine-template

[![Discord](https://img.shields.io/badge/chat-on%20discord-brightgreen.svg)](https://discord.gg/GsEFRM8) [![Try it on gitpod](https://img.shields.io/badge/try-on%20gitpod-brightgreen.svg)](https://gitpod.io/#https://github.com/Rob9315/mcproxy)

A template repository to make it easy to create new prismarine repo

## Usage

```js
import mcproxy from "mcproxy";

const proxy = new mcproxy.Proxy("localhost", 25566);
```

## API

### new Proxy(host, port)

creates a new proxy on specified host and port, is more of a standalone program in this form

### new User(proxyClient)

a User is a wrapper for a proxyClient for easier use and binding

### new Room(roomID, roomPassword)

a Room is an object responsible for linking User and BotConn

### new BotConn(Address, Account)

creates a new Mineflayer Bot for cashing purposes, to which a User can connect

#### BotConn.connect(User)

sends existing cashed data as packets to a client and subscribes them to all new packets

### new Address(host, port)

basically just an Object containing host and port

### new Account(username, password?)

An Object containing an username and optionally a password for connecting to servers, password is optional if connecting to cracked /"online-mode" Servers.
PLANNED: adding storage for the auth token so accounts can't get time-outed for too many connections

### output(object, data, packetMeta)

a function to ease logging packets

# TODO

nearly everything

WIP:

- building packets from a bot object, maybe own prismarine implementation?
- adding real cli interface (through mc client)
- adding real cli interface (through something else)
