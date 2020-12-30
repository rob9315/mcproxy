import * as conn from './conn.js';
import * as mc from 'minecraft-protocol';
class ConnContainer {
    constructor(connection, password) {
        this.connection = connection;
        this.password = password || '';
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
        this.server.on('login', (pclient) => {
            this.handleUser(pclient);
        });
    }
    handleUser(pclient) {
        pclient.write('login', { entityId: 9001, levelType: 'default' });
        pclient.write('position', { x: 0, y: 0, z: 0 });
        this.sendMessage(pclient, 'hello there', 'mcproxy', ',connect <connName> <connPassword>');
        pclient.on('packet', (data, meta) => {
            if (meta.name == 'chat') {
                let msg = data.message;
                let splitmsg = msg.split(' ');
                switch (splitmsg.length > 0) {
                    case false:
                        this.sendMessage(pclient, 'no1');
                        break;
                    case splitmsg[0].toLowerCase() === ',connect':
                        if (splitmsg.length === 3) {
                            if (this.connList[splitmsg[1]]?.verifyPassword(splitmsg[2])) {
                                this.connList[splitmsg[1]].connection.sendPackets(pclient);
                                this.connList[splitmsg[1]].connection.link(pclient);
                            }
                            else {
                                this.sendMessage(pclient, 'no2');
                            }
                        }
                        else {
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
                                    this.connList[splitmsg[3]] = new ConnContainer(this.newConn(pclient, { username: pclient.username, host: splitmsg[2].split(':')[0], port: +splitmsg[2].split(':')[1] }, false, ['keep_alive', 'chat']), splitmsg[4]);
                                }
                                else {
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
    wrongCommand(pclient, s, cmd) {
        this.sendMessage(pclient, s, 'mcproxy', cmd);
        console.log(s, 'mcproxy', cmd);
    }
    newConn(pclient, clientOptions, instantConnect, excludedPacketNames) {
        const connection = new conn.Conn(clientOptions, excludedPacketNames);
        if (instantConnect) {
            connection.bot.once('spawn', () => {
                connection.sendPackets(pclient);
                connection.link(pclient);
            });
        }
        return connection;
    }
    sendMessage(pclient, message, sender, suggestcommand) {
        pclient.write('chat', {
            message: `{"translate":"chat.type.text","with":[{"insertion":"mcproxy","clickEvent":{"action":"suggest_command","value":"${suggestcommand}"},"hoverEvent":{"action":"show_entity","value":{"text":"{name:\\"Rob9315\\",id:\\"the creator\\"}"}},"text":"${sender}"},"${message}"]}`,
            position: 0,
        });
    }
}
//# sourceMappingURL=proxyServer.js.map