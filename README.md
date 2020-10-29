# mcproxy

A wrapper for mineflayer able to generate packets for actual minecraft clients to connect to

This project includes a working proxy instance but the main focus is to make persistency through reconnections available as an importable class. 

# DISCLAIMER: STILL WAITING FOR MINEFLAYER UPDATE TO LOG objectUUID

## Easy usage

have the dependent program: nodejs (and npm)

download the project with git

```shell
git clone github.com/Rob9315/mcproxy.git
```

or the raw zip

edit app.js in lines 14 to 17 to reflect the server address you are trying to connect to and your credentials.

then open a terminal in your folder and run

```shell
node app.js
```

to start the proxy.

last step is to open your preferred minecraft client and connect to

```
localhost:25566
```

## API

### Conn()

starts a new Connection, takes mineflayers BotOptions as an Argument
