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
    constructor(options, requireAdminPassword) {
        super(undefined);
        this.connList = [];
        this.requireAdminPassword = requireAdminPassword || false;
        this.server = mc.createServer(options);
        this.server.on("login", (pclient) => {
            this.handleUser(pclient);
        });
    }
    handleUser(pclient) {
        pclient.write("login", { entityId: 9001, levelType: "default" });
        pclient.write("position", { x: 0, y: 0, z: 0 });
        this.sendMessage(pclient, "hello there", "mcproxy", ",connect <connName> <connPassword>");
        pclient.on("packet", (data, meta) => {
            if (meta.name == "chat") {
                let msg = data.message;
                let splitmsg = msg.split(" ");
                if (splitmsg.length > 1) {
                    switch (splitmsg[0].toLowerCase()) {
                        case ",connect": {
                            if (splitmsg.length === 3) {
                                if (this.connList[splitmsg[1]].verifyPassword(splitmsg[2])) {
                                    this.connList[splitmsg[1]].connection.sendPackets(pclient);
                                    this.connList[splitmsg[1]].connection.link(pclient);
                                }
                            }
                            else
                                this.wrongCommand(pclient, "wrong use of ',connect'", ",help");
                        }
                        case ",conn": {
                            if (splitmsg.length > 2) {
                                switch (splitmsg[1].toLowerCase()) {
                                    case "new": {
                                        if (splitmsg.length == 5 && splitmsg[2].split(":").length == 2 && !isNaN(+splitmsg[2].split(":")[1])) {
                                            this.connList[splitmsg[3]] = new ConnContainer(this.newConn(pclient, { username: pclient.username, host: splitmsg[2].split(":")[0], port: +splitmsg[2].split(":")[1] }, false, ["keep_alive", "chat"]));
                                        }
                                    }
                                    case "list": {
                                    }
                                    case "change": {
                                    }
                                    case "delete": {
                                    }
                                    case "restart": {
                                    }
                                    case "option": {
                                        if (splitmsg.length > 3) {
                                            switch (splitmsg[2].toLowerCase()) {
                                                case "reconnect": {
                                                }
                                                case "2b2tnotification": {
                                                }
                                                default:
                                                    this.wrongCommand(pclient, `,conn has the options [reconnect,2b2tnotification], "${splitmsg[2].toLowerCase()}" is not one of them`, ",conn option <option>");
                                            }
                                        }
                                    }
                                    default:
                                        this.wrongCommand(pclient, `,conn has the options [new,list,change,delete,restart,option], "${splitmsg[1].toLowerCase()}" is not one of them.`, ",conn <option>");
                                }
                            }
                        }
                        case ",this": {
                            switch (splitmsg[1].toLowerCase()) {
                                case "change": {
                                }
                                case "delete": {
                                }
                                case "restart": {
                                }
                                default:
                                    this.wrongCommand(pclient, `,this hat the options [change,delete,restart], "${splitmsg[1].toLowerCase()}" is not one of them.`);
                            }
                        }
                        case ",shutdown": {
                        }
                        default:
                            this.wrongCommand(pclient, `${splitmsg[0].toLowerCase()} is not a valid mcproxy command`, ",help");
                    }
                }
            }
        });
    }
    wrongCommand(pclient, s, cmd) {
        //this.sendMessage(pclient, s, "mcproxy", cmd);
        console.log(pclient, s, "mcproxy", cmd);
    }
    newConn(pclient, clientOptions, instantConnect, excludedPacketNames) {
        const connection = new conn.Conn(clientOptions, excludedPacketNames);
        if (instantConnect) {
            connection.bot.once("spawn", () => {
                connection.sendPackets(pclient);
                connection.link(pclient);
            });
        }
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