# mcproxy

A wrapper for mineflayer able to generate packets for actual minecraft clients to connect to

This project includes a working proxy instance but the main focus is to make persistency through reconnections available as an importable class. 

## Easy usage

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

and use the appropriate (commands)[https://github.com/rob9315/mcproxy/master/COMMANDS.md] via the ingame chat

## API

### Conn()

starts a new Connection, takes mineflayers BotOptions as an Argument
