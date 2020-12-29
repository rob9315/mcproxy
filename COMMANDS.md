# commands for [mcproxy](https://github.com/rob9315/mcproxy/) **(WIP, commands mostly not ready)**

mcproxy commands are inputted via the ingame chat and will be filtered out when connected to a server. all mcproxy commands start with a comma (`,`)

## `,conn`

`,conn` is your keyword in case you want to manage your connections

### `,conn new`

```
,conn new <host>:<port> <connName> <connPassword>
```

with the `,conn new` command you can create a new Connection to a Minecraft server. that Connection has to have a unused name (`<connName>`) and a password (`<connPassword>`) that you will have to remember in order to connect to it

### `,conn list`

```
,conn list
```

with this command you will get a list of all current connections

### `,conn change`

```
,conn change <connName> <connPassword/adminPassword> <newConnName> <newConnPassword>
```

with this command you can change the current name and /or password of a Connection

### `,conn delete`

```
,conn delete <connName> <connPassword/adminPassword>
```

with this command you can delete a current Connection to a server either with the set password or using the administrator password (`<adminPassword>`) you can set by editing the `config.json` file in the root of the project.

### `,conn restart`

```
,conn restart <connName> <connPassword/adminPassword>
```

with this comman you can reconnect to the server

### `,conn option`

```
,conn option <option> <value>
```

with this command you can change some options about the connection

#### option `reconnect`

reconnect automaticalle reconnects you if you were disconnected

#### option `2b2tnotification`

prints a message to the console if you waited through the queue of 2b2t

## `,this`

`,this` is your keyword to manage the connection you are on mostly without any passwords

### `,this change`

this lets you change the name and /or password of the Connection you are currently on

#### `,this change name`

```
,this change name <newConnName>
```

this lets you change the name of the Connection you are on

### `,this change password`

```
,this change password <newConnPassword>
```

this lets you change the password of the Connection you are on

### `,this delete`

```
,this delete <connPassword/adminPassword>
```

### `,this restart`

```
,this restart <connPassword/adminPassword>
```

this restarts the connection you are currently on

## `,shutdown <adminPassword>`

disconnects every Connection and ends the program
