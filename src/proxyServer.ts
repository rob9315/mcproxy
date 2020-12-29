import * as conn from "./conn.js";
import * as mc from "minecraft-protocol";

interface proxyServerOptions extends mc.ServerOptions {}

class ConnContainer {
  connection: conn.Conn;
  private password: string;
  constructor(connection: conn.Conn, password?: string) {
    this.connection = connection;
    this.password = password || "";
  }
  changePassword(password: string) {
    this.password = password;
  }
  verifyPassword(password: string) {
    return this.password === password;
  }
}

export class ProxyServer extends mc.Server {
  connList: ConnContainer[];
  server: mc.Server;
  constructor(options: proxyServerOptions) {
    super((undefined as unknown) as any);
    this.connList = [];
    this.server = mc.createServer(options);
    this.server.on("login", (pclient) => {
      this.handleUser(pclient);
    });
  }
  handleUser(pclient: mc.Client) {
    pclient.write("login", {
      entityId: 15200,
      dimension: "minecraft:the_end",
      //difficulty: "easy",
      //gamemode: "spectator",
      levelType: "default",
    });
    pclient.write("position", { x: 0, y: 0, z: 0 });
    this.sendMessage(
      pclient,
      "hello there",
      "mcproxy",
      ",connect <host>:<port>"
    );
    pclient.on("packet", (data, meta) => {
      if (meta.name == "chat" && data.message.startsWith(",")) {
        let msg: string = data.message;
        switch (true) {
          case msg.startsWith(",connect"): {
            let splitmsgarr: string[] = msg.split(" ");
            if (splitmsgarr.length == 4) {
              let addr: string[] = splitmsgarr[1].split(":");
              if (!isNaN(+addr[1]) && !this.connList[splitmsgarr[2] as any]) {
                this.connList[splitmsgarr[2] as any] = new ConnContainer(
                  this.newConn(
                    pclient,
                    {
                      username: pclient.username,
                      host: addr[0],
                      port: +addr[1],
                    },
                    ["keep_alive", "chat"]
                  ),
                  splitmsgarr[3]
                );
              }
            } else {
              this.sendMessage(
                pclient,
                "that is not the correct form",
                "mcproxy",
                ".connect <host>:<port> <roomname> <roompassword>"
              );
            }
          }
          case msg.startsWith(",reconnect"): {
            let splitmsgarr: string[] = msg.split(" ");
            if (splitmsgarr.length == 3) {
              if (this.connList[splitmsgarr[1] as any]) {
                if (
                  this.connList[splitmsgarr[1] as any].verifyPassword(
                    splitmsgarr[2]
                  )
                ) {
                  this.connList[splitmsgarr[1] as any].connection.sendPackets(
                    pclient
                  );
                  this.connList[splitmsgarr[1] as any].connection.link(pclient);
                } else {
                  this.sendMessage(
                    pclient,
                    `you have an incorrect password`,
                    "mcproxy"
                  );
                }
              } else {
                this.sendMessage(
                  pclient,
                  `there is no room with the name of "${splitmsgarr[1]}"`,
                  "mcproxy"
                );
              }
            }
          }
        }
      }
    });
  }
  newConn(
    pclient: mc.Client,
    clientOptions: mc.ClientOptions,
    excludedPacketNames?: string[]
  ) {
    const connection: conn.Conn = new conn.Conn(
      clientOptions,
      excludedPacketNames
    );
    connection.bot._client.on("packet", (data, meta) => {
      if (meta.name == "chat") {
        console.log(data);
      }
    });
    connection.bot.once("spawn", () => {
      connection.sendPackets(pclient);
      connection.link(pclient);
    });
    return connection;
  }
  sendMessage(
    pclient: mc.Client,
    message: string,
    sender?: string,
    suggestcommand?: string
  ) {
    pclient.write("chat", {
      message: `{"translate":"chat.type.text","with":[{"insertion":"mcproxy","clickEvent":{"action":"suggest_command","value":"${suggestcommand}"},"hoverEvent":{"action":"show_entity","value":{"text":"{name:\\"Rob9315\\",id:\\"the creator\\"}"}},"text":"${sender}"},"${message}"]}`,
      position: 0,
    });
  }
}
