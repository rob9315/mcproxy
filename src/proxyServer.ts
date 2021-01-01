import { Conn } from './conn.js';
import * as mc from 'minecraft-protocol';
import { BotOptions } from 'mineflayer';

interface proxyServerOptions extends mc.ServerOptions {}

class ConnContainer {
  connection: Conn;
  private password: string;
  constructor(connection: Conn, password?: string) {
    this.connection = connection;
    this.password = password || '';
  }
  changePassword(password: string) {
    this.password = password;
  }
  verifyPassword(password: string) {
    return this.password === password;
  }
}

export class ProxyServer {
  connList: ConnContainer[];
  userList: Conn[];
  server: mc.Server;
  requireAdminPassword: boolean;
  constructor(options: proxyServerOptions, requireAdminPassword?: boolean) {
    this.connList = [];
    this.userList = [];
    this.requireAdminPassword = requireAdminPassword || false;
    this.server = mc.createServer(options);
    this.server.on('login', (pclient) => {
      this.handleUser(pclient);
    });
    console.log('proxyServer UP');
  }
  handleUser(pclient: mc.Client) {
    pclient.write('login', { entityId: 9001, levelType: 'default', dimension: -1 });
    pclient.write('position', { x: 0, y: 0, z: 0 });
    this.sendMessage(pclient, 'welcome to mcproxy, a project by Rob9315', { suggestcommand: ',connect <connName> <connPassword>' });
    this.sendMessage(pclient, `to see all commands, type ',help'`);
    pclient.on('packet', (data, meta) => {
      if (meta.name == 'chat') {
        let msg: string = data.message;
        let splitmsg: string[] = msg.split(' ');
        splitmsg.forEach((value) => (value = value.toLowerCase()));
        switch (splitmsg.length > 0) {
          case false:
            this.sendMessage(pclient, 'what');
            this.sendMessage(pclient, 'how');
            break;
          case splitmsg[0] === ',help':
            this.sendMessage(pclient, `visit https://github.com/rob9315/mcproxy/blobs/master/commands.md for all commands`);
            break;
          case splitmsg[0] === ',connect':
            if (splitmsg.length === 3) {
              if (this.connList[splitmsg[1] as any]?.verifyPassword(splitmsg[2])) {
                this.connectUserToConn(pclient, this.connList[splitmsg[1] as any].connection);
              } else {
                this.sendMessage(pclient, `wrong password for Connection '${splitmsg[1]}, or it does not exist'`);
              }
            } else {
              this.sendMessage(pclient, `wrong amount of parameters specified for ,connect`, { suggestcommand: ',help' });
            }
            break;
          case splitmsg[0] === ',conn':
            switch (splitmsg.length > 1) {
              case false:
                this.sendMessage(pclient, 'wrong amount of parameters specified for ,conn', { suggestcommand: ',help' });
                break;
              case splitmsg[1] === 'new':
                if (splitmsg.length === 5 && splitmsg[2].split(':').length === 2 && !isNaN(+splitmsg[2].split(':')[1])) {
                  this.newConn(pclient, splitmsg[3], splitmsg[4], splitmsg[2].split(':')[0], +splitmsg[2].split(':')[1]);
                  this.sendMessage(pclient, `Connection '${splitmsg[3]}' has been created`);
                } else {
                  this.sendMessage(pclient, 'wrong use of ,conn new', { suggestcommand: ',help' });
                }
                break;
              case splitmsg[1] === 'list':
                this.sendMessage(pclient, `here is a list of all Connections:`);
                for (const key in this.connList) {
                  if (Object.prototype.hasOwnProperty.call(this.connList, key)) {
                    this.sendMessage(pclient, `${key}`);
                  }
                }
                break;
              case splitmsg[1] === 'change':
                if (splitmsg.length === 6 && this.connList[splitmsg[2] as any]?.verifyPassword(splitmsg[3])) this.changeConn(splitmsg[2], splitmsg[4], splitmsg[5]);
                break;
              case splitmsg[1] === 'delete':
                if (splitmsg.length === 4 && this.connList[splitmsg[2] as any]?.verifyPassword(splitmsg[3])) this.deleteConn(splitmsg[2]);
                break;
              case splitmsg[1] === 'restart':
                break;
              case splitmsg[1] === 'option':
                switch (splitmsg.length === 3) {
                  case false:
                    this.sendMessage(pclient, 'no6');
                    break;
                  case splitmsg[2] === 'autoreconnect':
                    break;
                  case splitmsg[2] === '2b2tnotification':
                    break;
                  case true:
                    this.sendMessage(pclient, 'no7');
                    break;
                }
                break;
              case true:
                this.sendMessage(pclient, 'no8');
                break;
            }
            break;
          case splitmsg[0] === ',this':
            switch (splitmsg.length > 1) {
              case false:
                this.sendMessage(pclient, 'no9');
                break;
              case splitmsg[1] === 'change':
                break;
              case splitmsg[1] === 'delete':
                break;
              case splitmsg[1] === 'restart':
                break;
              case true:
                this.sendMessage(pclient, 'no10');
                break;
            }
            break;
          case splitmsg[0] === ',shutdown':
            break;
          case splitmsg[0] === ',disconnect':
            this.returnUserToLobby(pclient);
            break;
          case true:
            if (this.userList[pclient as any]) this.userList[pclient as any].write('chat', data);
            else this.sendMessage(pclient, msg, { sender: pclient.username });
            break;
        }
      }
    });
  }
  deleteConn(connId: string) {
    this.connList[connId as any].connection.disconnect();
    delete this.connList[connId as any];
  }
  changeConn(oldConnId: string, newConnId: string, newConnPassword: string) {
    if (oldConnId !== newConnId) {
      this.connList[newConnId as any] = this.connList[oldConnId as any];
      delete this.connList[oldConnId as any];
    }
    this.connList[newConnId as any].changePassword(newConnPassword);
  }
  disconnectUserFromConn(pclient: mc.Client) {
    this.userList[pclient as any]?.unlink();
    delete this.userList[pclient as any];
  }
  connectUserToConn(pclient: mc.Client, connection: Conn) {
    this.disconnectUserFromConn(pclient);
    this.userList[pclient as any] = connection;
    this.userList[pclient as any].sendPackets(pclient);
    this.userList[pclient as any].link(pclient);
    this.sendMessage(pclient, 'you should be connected');
  }
  returnUserToLobby(pclient: mc.Client) {
    this.disconnectUserFromConn(pclient);
    pclient.write('respawn', { entityId: 9001, levelType: 'default', dimension: -1 });
    pclient.write('position', { x: 0, y: 0, z: 0 });
  }
  newConn(pclient: mc.Client, connId: string, connPassword: string, host: string, port: number, optargs?: { instantConnect?: boolean; excludedPacketNames?: string[]; botOptions?: BotOptions }) {
    if (!optargs) optargs = { instantConnect: false, excludedPacketNames: ['keep_alive', 'chat'] };
    if (optargs.botOptions) {
      optargs.botOptions.host = host;
      optargs.botOptions.port = port;
    }
    const connection: Conn = new Conn(optargs?.botOptions || { username: pclient.username, host, port }, optargs?.excludedPacketNames);
    if (optargs?.instantConnect) {
      connection.bot.once('spawn', () => {
        connection.sendPackets(pclient);
        connection.link(pclient);
      });
    }
    this.connList[connId as any] = new ConnContainer(connection, connPassword);
  }
  sendMessage(pclient: mc.Client, message: string, extra?: { suggestcommand?: string; sender?: string }) {
    pclient.write('chat', {
      message: `{"translate":"chat.type.text","with":[{"insertion":"mcproxy","clickEvent":{"action":"suggest_command","value":"${
        extra?.suggestcommand || ''
      }"},"hoverEvent":{"action":"show_entity","value":{"text":"{name:\\"Rob9315\\",id:\\"the creator\\"}"}},"text":"${extra?.sender || 'mcproxy'}"},"${message}"]}`,
      position: 0,
    });
  }
}
