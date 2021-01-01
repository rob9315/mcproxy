import * as conn from './conn.js';
import * as mc from 'minecraft-protocol';

interface proxyServerOptions extends mc.ServerOptions {}

class ConnContainer {
  connection: conn.Conn;
  private password: string;
  constructor(connection: conn.Conn, password?: string) {
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
  userList: conn.Conn[];
  server: mc.Server;
  requireAdminPassword: boolean;
  constructor(options: proxyServerOptions, requireAdminPassword?: boolean) {
    this.connList = [];
    this.userList = [];
    this.requireAdminPassword = requireAdminPassword || false;
    this.server = mc.createServer(options);
    // this.server.on('connection', (pclient) => {
    // let wr = this.server.clients[0].write.bind(this.server.clients[0]);
    // this.server.clients[].write = function (name: string, params: any) {
    //   console.log('s>c>', name, params);
    //   wr(name, params);
    // }.bind(this.server.clients[0]);
    //   pclient.on('packet', (data, meta) => {
    //     console.log('c>s>', meta.name, data);
    //   });
    // });
    this.server.on('login', (pclient) => {
      this.handleUser(pclient);
    });
    console.log('proxyServer UP');
  }
  handleUser(pclient: mc.Client) {
    // console.log(pclient);
    // console.log(pclient.profile);
    // console.log(pclient.session);
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
                this.userList[pclient as any]?.unlink();
                this.userList[pclient as any] = this.connList[splitmsg[1] as any].connection;
                this.userList[pclient as any].sendPackets(pclient);
                this.userList[pclient as any].link(pclient);
                this.sendMessage(pclient, 'you should be connected');
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
                  this.connList[splitmsg[3] as any] = new ConnContainer(this.newConn(pclient, { username: pclient.username, host: splitmsg[2].split(':')[0], port: +splitmsg[2].split(':')[1] }, false, ['keep_alive', 'chat']), splitmsg[4]);
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
                if (splitmsg.length === 6 && this.connList[splitmsg[2] as any]?.verifyPassword(splitmsg[3])) {
                  if (splitmsg[2] !== splitmsg[4]) {
                    this.connList[splitmsg[4] as any] = this.connList[splitmsg[2] as any];
                    delete this.connList[splitmsg[2] as any];
                  }
                  if (splitmsg[3] !== splitmsg[5]) {
                    this.connList[splitmsg[4] as any].changePassword(splitmsg[5]);
                  }
                }
                break;
              case splitmsg[1] === 'delete':
                if (splitmsg.length === 4 && this.connList[splitmsg[2] as any]?.verifyPassword(splitmsg[3])) {
                  this.connList[splitmsg[2] as any].connection.disconnect();
                  delete this.connList[splitmsg[2] as any];
                }
                break;
              case splitmsg[1] === 'restart':
                break;
              case splitmsg[1] === 'option':
                switch (splitmsg.length === 3) {
                  case false:
                    this.sendMessage(pclient, 'no6');
                    break;
                  case splitmsg[2] === 'reconnect':
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
            this.userList[pclient as any].unlink();
            delete this.userList[pclient as any];
            pclient.write('respawn', { entityId: 9001, levelType: 'default', dimension: -1 });
            pclient.write('position', { x: 0, y: 0, z: 0 });
            break;
          case true:
            this.sendMessage(pclient, msg, { sender: pclient.username });
            break;
        }
      }
    });
  }
  newConn(pclient: mc.Client, clientOptions: mc.ClientOptions, instantConnect: boolean, excludedPacketNames?: string[]) {
    const connection: conn.Conn = new conn.Conn(clientOptions, excludedPacketNames);
    if (instantConnect) {
      connection.bot.once('spawn', () => {
        connection.sendPackets(pclient);
        connection.link(pclient);
      });
    }
    return connection;
  }
  sendMessage(pclient: mc.Client, message: string, extra?: { suggestcommand?: string; sender?: string }) {
    pclient.write('chat', {
      message: `{"translate":"chat.type.text","with":[{"insertion":"mcproxy","clickEvent":{"action":"suggest_command","value":"${
        extra?.suggestcommand || ''
      }"},"hoverEvent":{"action":"show_entity","value":{"text":"{name:\\"Rob9315\\",id:\\"the creator\\"}"}},"text":"${extra?.sender || 'mcproxy'}"},"${message}"]}`,
      position: 0,
    });
    // console.log(`${extra?.sender || 'mcproxy'}>${message}`);
  }
}
