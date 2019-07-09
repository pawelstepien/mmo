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
    constructor(socket, x, y) {
        this.socket = socket;
        this.x = x;
        this.y = y;
        this.lastMoveTime = 0;
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
    sendState(state) {
        const stringifiedState = JSON.stringify(state);
        this.socket.emit('state update', stringifiedState);
    }
}

class MapField {
    constructor() {
        this.player = null;
        this.isPassable = true;
    }
}

class Map {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.fields = [];

        for (let x = 0; x < width; x++) {
            this.fields.push([]);
            for (let y = 0; y < height; y++) {
                this.fields[x].push(new MapField());
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
                    objectToPush.player = (this.fields[x + xFrom][y + yFrom].player === null ? null : { x: this.fields[x + xFrom][y + yFrom].player.x, y: this.fields[x + xFrom][y + yFrom].player.y, id: this.fields[x + xFrom][y + yFrom].player.socket.id});
                    objectToPush.isPassable = this.fields[x + xFrom][y + yFrom].isPassable || false;
                    data[x][y] = objectToPush;
                } else {
                    
                }
            }
        }
        return data;
    }
}

class Game {
    constructor() {
        this.players = {};
        this.map = new Map(32, 32);
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
    addPlayer(socket) {
        let x, y;
        do {
            x = Math.floor(Math.random() * this.map.width);
            y = Math.floor(Math.random() * this.map.height);
        } while (!this.map.fields[x][y].isPassable || this.map.fields[x][y].player !== null);
        const player = new Player(socket, x, y);
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
                const accountData = this.getAccountData(credentials.login, credentials.password);
                if (accountData) {
                    this.players[socket.id] = this.addPlayer(socket);
                    socket.emit('player id', socket.id)
                } else {
                    socket.emit('credential rejected')
                }
            });            

            socket.on('disconnect', () => {
                if (this.players[socket.id]) {
                    this.removePlayer(this.players[socket.id]);
                    delete this.players[socket.id];
                }
            });

            socket.on('move player', data => {
                this.players[socket.id].move(this.map, data.xTranslation, data.yTranslation);
            });

        });
    }
};

const game = new Game();
game.start();