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

export class ProxyServer extends mc.Server {
  connList: ConnContainer[];
  server: mc.Server;
  requireAdminPassword: boolean;
  constructor(options: proxyServerOptions, requireAdminPassword?: boolean) {
    super((undefined as unknown) as any);
    this.connList = [];
    this.requireAdminPassword = requireAdminPassword || false;
    this.server = mc.createServer(options);
    this.server.on('login', (pclient) => {
      this.handleUser(pclient);
    });
  }
  handleUser(pclient: mc.Client) {
    pclient.write('login', { entityId: 9001, levelType: 'default' });
    pclient.write('position', { x: 0, y: 0, z: 0 });
    this.sendMessage(pclient, 'hello there', 'mcproxy', ',connect <connName> <connPassword>');
    pclient.on('packet', (data, meta) => {
      if (meta.name == 'chat') {
        let msg: string = data.message;
        let splitmsg: string[] = msg.split(' ');
        switch (splitmsg.length > 0) {
          case false:
            this.sendMessage(pclient, 'no1');
            break;
          case splitmsg[0].toLowerCase() === ',connect':
            if (splitmsg.length === 3) {
              if (this.connList[splitmsg[1] as any]?.verifyPassword(splitmsg[2])) {
                this.connList[splitmsg[1] as any].connection.sendPackets(pclient);
                this.connList[splitmsg[1] as any].connection.link(pclient);
              } else {
                this.sendMessage(pclient, 'no2');
              }
            } else {
              //this.wrongCommand(pclient, "wrong use of ',connect'", ',help');
              this.sendMessage(pclient, 'no3');
            }
            break;
          case splitmsg[0].toLowerCase() === ',conn':
            switch (splitmsg.length > 1) {
              case false:
                //this.wrongCommand(pclient, 'wrong amount of arguments for ,conn', ',help');
                this.sendMessage(pclient, 'no4');
                break;
              case splitmsg[1].toLowerCase() === 'new':
                if (splitmsg.length === 5 && splitmsg[2].split(':').length === 2 && !isNaN(+splitmsg[2].split(':')[1])) {
                  this.connList[splitmsg[3] as any] = new ConnContainer(this.newConn(pclient, { username: pclient.username, host: splitmsg[2].split(':')[0], port: +splitmsg[2].split(':')[1] }, false, ['keep_alive', 'chat']), splitmsg[4]);
                } else {
                  this.sendMessage(pclient, 'no5');
                }
                break;
              case splitmsg[1].toLowerCase() === 'list':
                console.log('NOOOOOO');
                break;
              case splitmsg[1].toLowerCase() === 'change':
                break;
              case splitmsg[1].toLowerCase() === 'delete':
                break;
              case splitmsg[1].toLowerCase() === 'restart':
                break;
              case splitmsg[1].toLowerCase() === 'option':
                switch (splitmsg.length === 3) {
                  case false:
                    this.sendMessage(pclient, 'no6');
                    //this.wrongCommand(pclient, `wrong ,conn usage`, ',conn option <option>');
                    break;
                  case splitmsg[2].toLowerCase() === 'reconnect':
                    break;

                  case splitmsg[2].toLowerCase() === '2b2tnotification':
                    break;
                  case true:
                    this.sendMessage(pclient, 'no7');
                    //this.wrongCommand(pclient, `,conn has the options [reconnect,2b2tnotification], "${splitmsg[2].toLowerCase()}" is not one of them`, ',conn option <option>');
                    break;
                }
                break;
              case true:
                this.sendMessage(pclient, 'no8');
                //this.wrongCommand(pclient, `,conn has the options [new,list,change,delete,restart,option], "${splitmsg[1].toLowerCase()}" is not one of them.`, ',conn <option>');
                break;
            }
            break;
          case splitmsg[0].toLowerCase() === ',this':
            switch (splitmsg.length > 1) {
              case false:
                this.sendMessage(pclient, 'no9');
                //this.wrongCommand(pclient, "wrong amount of parameters specified for ',this'", ',help');
                break;
              case splitmsg[1].toLowerCase() === 'change':
                break;
              case splitmsg[1].toLowerCase() === 'delete':
                break;
              case splitmsg[1].toLowerCase() === 'restart':
                break;
              case true:
                this.sendMessage(pclient, 'no10');
                //this.wrongCommand(pclient, `,this hat the options [change,delete,restart], "${splitmsg[1].toLowerCase()}" is not one of them.`);
                break;
            }
            break;
          case splitmsg[0].toLowerCase() === ',shutdown':
            break;
          case true:
            this.sendMessage(pclient, 'no11');
            //this.wrongCommand(pclient, `${splitmsg[0].toLowerCase()} is not a valid mcproxy command`, ',help');}
            break;
        }
      }
    });
  }
  private wrongCommand(pclient: mc.Client, s: string, cmd?: string) {
    this.sendMessage(pclient, s, 'mcproxy', cmd);
    console.log(s, 'mcproxy', cmd);
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
  sendMessage(pclient: mc.Client, message: string, sender?: string, suggestcommand?: string) {
    pclient.write('chat', {
      message: `{"translate":"chat.type.text","with":[{"insertion":"mcproxy","clickEvent":{"action":"suggest_command","value":"${suggestcommand}"},"hoverEvent":{"action":"show_entity","value":{"text":"{name:\\"Rob9315\\",id:\\"the creator\\"}"}},"text":"${sender}"},"${message}"]}`,
      position: 0,
    });
  }
}
