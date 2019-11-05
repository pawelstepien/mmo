const express = require('express');
const fs = require('fs');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('./client'))

http.listen(1337, () => {
    console.log('listening on *:1337');
});

class Player {
    constructor(socket, accountData, x, y) {
        this.socket = socket;
        this.x = x;
        this.y = y;
        this.lastMoveTime = 0;
        this.lastAttackTime = 0;
        this.name = accountData.name;
        this.health = accountData.health
        this.maxHealth = accountData.maxHealth;
        this.damage = accountData.damage;
    }
    //x and y axises translation relative to current place
    move(map, xTranslation, yTranslation) {
        console.log('player move ', xTranslation, yTranslation, this.x, this.y)
        const currentTime = new Date();
        const xSum = this.x + xTranslation;
        const ySum = this.y + yTranslation;

        if (xSum >= 0 && ySum >= 0 &&
            xSum < map.width && ySum < map.height &&
            map.fields[xSum][ySum] !== null &&
            map.fields[xSum][ySum].isPassable && 
            this.lastMoveTime - currentTime < -200) {

            map.fields[xSum][ySum].player = this;
            map.fields[xSum][ySum].isPassable = false;
            map.fields[this.x][this.y].player = null;
            map.fields[this.x][this.y].isPassable = true;
            this.lastMoveTime = currentTime;
            this.x = xSum;
            this.y = ySum;
        } else {
            console.log('rejected player movement', xSum, ySum, this.lastMoveTime - currentTime, this.lastMoveTime, currentTime)
        }
    }

    receiveDamage(map, healthLost) {
        if (this.health - healthLost <= 0) {
            this.socket.disconnect();
            return;
        }
        console.log(this.name, 'received damage', healthLost)
        this.health -= healthLost;
        map[this.x][this.y].addMessage('damage', healthLost.toString());
    };

    attack(map, target) {
        console.log('attak',this.damage )
        const currentTime = new Date();
        if (this.lastMoveTime - currentTime < -500) {
            this.lastMoveTime = currentTime;
            target.receiveDamage(map, this.damage);
        }
    }

    sendState(state) {
        const stringifiedState = JSON.stringify(state);
        this.socket.emit('state update', stringifiedState);
    }
}

class MapField {
    constructor(data) {
        this.surface = data.surface || null;
        this.structure = data.structure || null;
        this.player = null;
        this.isPassable = this.structure ? false : true;
        this.messages = [];
    }
    addMessage(player, message) {
        if (this.messages.length > 5) { console.log('ten if'); return; }
        console.log('elsee')
        this.messages.push({player: player, message: message});
        setTimeout(() => {
            this.messages.shift();
        }, 3000 + message.length*25);
    }
}

class Map {
    constructor(width, height, tileMap) {
        this.width = width;
        this.height = height;
        this.fields = [];

        // console.log('new map', tileMap)
        if (tileMap) {
            for (let x = 0; x < width; x++) {
                this.fields.push([]);
                for (let y = 0; y < height; y++) {
                    this.fields[x].push(new MapField(tileMap[x][y]));
                }
            }
        } else {
            for (let x = 0; x < width; x++) {
                this.fields.push([]);
                for (let y = 0; y < height; y++) {
                    this.fields[x].push(new MapField('grass_' + (Math.floor(Math.random() * 7) + 1)));
                }
            }
        }
        
    }
    getData(xFrom, yFrom, xTo, yTo) {
        xFrom = xFrom || 0;
        yFrom = yFrom || 0;
        xTo = xTo || this.width - 1;
        yTo = yTo || this.height - 1;
        let data = [];

        for (let x = 0; x + xFrom <= xTo; x++) {
            data.push([]);
            for (let y = 0; y + yFrom <= yTo; y++) {
                data[x][y] = null;
                if (!(x + xFrom < 0 || y + yFrom < 0 || x >= this.width || y >= this.height) &&
                    typeof this.fields[x + xFrom] !== 'undefined' && typeof this.fields[x + xFrom][y + yFrom] !== 'undefined') {

                    const objectToPush = {};
                    const field = this.fields[x + xFrom][y + yFrom];
                    objectToPush.player = (field.player === null ? null : { 
                        x: field.player.x, 
                        y: field.player.y, 
                        name: field.player.name, 
                        health: Math.round((field.player.health/field.player.maxHealth)*100)
                    });
                    objectToPush.isPassable = field.isPassable || false;
                    objectToPush.surface = field.surface || null;
                    objectToPush.structure = field.structure || null;
                    objectToPush.messages = field.messages || null;
                    data[x][y] = objectToPush;


                }
            }
        }
        return data;
    }
}

class Game {
    constructor() {
        this.players = {};
        this.tileMap = JSON.parse(fs.readFileSync('tile_map.json'));
        this.map = new Map(20, 20, this.tileMap);
        this.isServerOnline = false;
        this.accountsData = JSON.parse(fs.readFileSync('players.json'));
    }
    getAccountData(login, password) {
        const account = this.accountsData.find(account => account.login === login);
        if (!account) {
            console.log('login not found', login)
            return null;
        }
        if (account.password !== password) {
            console.log('wrong password', login, password);
            return null;
        }
        return account;
    }
    addPlayer(socket, accountData) {
        let x, y;
        do {
            x = Math.floor(Math.random() * this.map.width);
            y = Math.floor(Math.random() * this.map.height);
        } while (!this.map.fields[x][y].isPassable || this.map.fields[x][y].player !== null);
        const player = new Player(socket, accountData, x, y);
        this.map.fields[x][y].player = player;
        this.map.fields[x][y].isPassable = false;
        return player;
    }
    removePlayer(player) {
        const x = player.x;
        const y = player.y;
        this.map.fields[x][y].player = null;
        this.map.fields[x][y].isPassable = true;
        delete this.players[player.id];
    }
    sendStateToPlayers() {
        const playersKeys = Object.keys(this.players || {}); //?
        if (playersKeys.length === 0) {
            return;
        }
        playersKeys.forEach(key => {
            const player = this.players[key];
            const state = this.map.getData(player.x - 8, player.y - 8, player.x + 8, player.y + 8);
            player.sendState(state);
        });
    };
    start() {
        this.isServerOnline = true;
        setInterval(this.sendStateToPlayers.bind(this), 250);

        io.on('connection', socket => {

            socket.on('login', credentials => {
                console.log('login')
                const accountData = this.getAccountData(credentials.login, credentials.password);
                if (accountData) {
                    this.players[socket.id] = this.addPlayer(socket, accountData);
                    socket.emit('login', accountData)
                } else {
                    socket.emit('credential rejected')
                }
            });            

            socket.on('disconnect', () => {
                if (this.players[socket.id]) {
                    console.log('disconnect', this.players[socket.id].name)
                    this.removePlayer(this.players[socket.id]);
                    delete this.players[socket.id];
                }
            });

            socket.on('move player', data => {
                if (this.players[socket.id]) {
                    this.players[socket.id].move(this.map, data.xTranslation, data.yTranslation);
                }
            });

            socket.on('attack player', target => {
                console.log('attack player')
                if (this.map.fields[target.x][target.y].player && this.players[socket.id]) {
                    this.players[socket.id].attack(this.map.fields, this.map.fields[target.x][target.y].player);
                }
            });

            socket.on('message', message => {
                if (this.players[socket.id]) {
                    console.log('received message', socket.id, message)
                    const player = this.players[socket.id];
                    this.map.fields[player.x][player.y].addMessage(player.name, message)
                }
            });
        });
    }
};

const game = new Game();
game.start();