import * as conn from "./conn.js";
import * as mc from "minecraft-protocol";
class ConnContainer {
    constructor(connection, password) {
        this.connection = connection;
        this.password = password || "";
    }
    changePassword(password) {
        this.password = password;
    }
    verifyPassword(password) {
        return this.password === password;
    }
}
export class ProxyServer extends mc.Server {
    constructor(options) {
        super(undefined);
        this.connList = [];
        this.server = mc.createServer(options);
        this.server.on("login", (pclient) => {
            this.handleUser(pclient);
        });
    }
    handleUser(pclient) {
        pclient.write("login", {
            entityId: 15200,
            dimension: "minecraft:the_end",
            //difficulty: "easy",
            //gamemode: "spectator",
            levelType: "default",
        });
        pclient.write("position", { x: 0, y: 0, z: 0 });
        this.sendMessage(pclient, "hello there", "mcproxy", ",connect <host>:<port>");
        pclient.on("packet", (data, meta) => {
            if (meta.name == "chat" && data.message.startsWith(",")) {
                let msg = data.message;
                switch (true) {
                    case msg.startsWith(",connect"): {
                        let splitmsgarr = msg.split(" ");
                        if (splitmsgarr.length == 4) {
                            let addr = splitmsgarr[1].split(":");
                            if (!isNaN(+addr[1]) && !this.connList[splitmsgarr[2]]) {
                                this.connList[splitmsgarr[2]] = new ConnContainer(this.newConn(pclient, {
                                    username: pclient.username,
                                    host: addr[0],
                                    port: +addr[1],
                                }, ["keep_alive", "chat"]), splitmsgarr[3]);
                            }
                        }
                        else {
                            this.sendMessage(pclient, "that is not the correct form", "mcproxy", ".connect <host>:<port> <roomname> <roompassword>");
                        }
                    }
                    case msg.startsWith(",reconnect"): {
                        let splitmsgarr = msg.split(" ");
                        if (splitmsgarr.length == 3) {
                            if (this.connList[splitmsgarr[1]]) {
                                if (this.connList[splitmsgarr[1]].verifyPassword(splitmsgarr[2])) {
                                    this.connList[splitmsgarr[1]].connection.sendPackets(pclient);
                                    this.connList[splitmsgarr[1]].connection.link(pclient);
                                }
                                else {
                                    this.sendMessage(pclient, `you have an incorrect password`, "mcproxy");
                                }
                            }
                            else {
                                this.sendMessage(pclient, `there is no room with the name of "${splitmsgarr[1]}"`, "mcproxy");
                            }
                        }
                    }
                }
            }
        });
    }
    newConn(pclient, clientOptions, excludedPacketNames) {
        const connection = new conn.Conn(clientOptions, excludedPacketNames);
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
    sendMessage(pclient, message, sender, suggestcommand) {
        pclient.write("chat", {
            message: `{"translate":"chat.type.text","with":[{"insertion":"mcproxy","clickEvent":{"action":"suggest_command","value":"${suggestcommand}"},"hoverEvent":{"action":"show_entity","value":{"text":"{name:\\"Rob9315\\",id:\\"the creator\\"}"}},"text":"${sender}"},"${message}"]}`,
            position: 0,
        });
    }
}
//# sourceMappingURL=proxyServer.js.map