import * as conn from "./conn.js";
import * as mc from "minecraft-protocol";
interface proxyServerOptions extends mc.ServerOptions {
}
declare class ConnContainer {
    connection: conn.Conn;
    private password;
    constructor(connection: conn.Conn, password?: string);
    changePassword(password: string): void;
    verifyPassword(password: string): boolean;
}
export declare class ProxyServer extends mc.Server {
    connList: ConnContainer[];
    server: mc.Server;
    constructor(options: proxyServerOptions);
    handleUser(pclient: mc.Client): void;
    newConn(pclient: mc.Client, clientOptions: mc.ClientOptions, excludedPacketNames?: string[]): conn.Conn;
    sendMessage(pclient: mc.Client, message: string, sender?: string, suggestcommand?: string): void;
}
export {};
