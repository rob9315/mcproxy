import mc from 'minecraft-protocol';
import mineflayer from 'mineflayer';
export declare class Address {
    host: string;
    port: number;
    constructor(host: string, port: number);
}
export declare class Account {
    username: string;
    password: string;
    constructor(username: string, password: string);
}
export declare class User {
    proxyClient: mc.Client;
    constructor(proxyClient: mc.Client);
}
export declare class BotConn {
    address: Address;
    account: Account;
    bot: mineflayer.Bot;
    client: mc.Client;
    constructor(address: Address, account: Account);
}
export declare class Room {
    users: User[];
    botConns: BotConn[];
    roomID: number;
    roomPassword: string;
    constructor(roomID: number, roomPassword: string);
    addUser(user: User): void;
    addBotConn(botConn: BotConn): void;
    linkUser(user: User, botConn: BotConn): void;
}
export declare class Proxy {
    rooms: Room[];
    users: User[];
    botConns: BotConn[];
    host: string;
    port: number;
    proxyServer: mc.Server;
    serverOptions: mc.ServerOptions;
    constructor(host: string, port: number);
}
export declare function output(object: any, data: any, packetMeta: mc.PacketMeta): void;
