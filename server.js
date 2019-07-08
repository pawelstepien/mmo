const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('./'))

http.listen(1337, () => {
    console.log('listening on *:1337');
});

class Player {
    constructor(socket, x, y) {
        this.socket = socket;
        this.x = x;
        this.y = y;
    }
    //x and y axises transition relative to current place
    move(map, xTransition, yTransition) {
        console.log('player move ', xTransition, yTransition, this.x, this.y)
        const xSum = this.x + xTransition;
        const ySum = this.y + yTransition

        if (xSum >= 0 && ySum >= 0 &&
            xSum < map.width && ySum < map.height &&
            map.fields[xSum][ySum] !== null &&
            map.fields[xSum][ySum].isPassable) {

            map.fields[xSum][ySum].player = this;
            map.fields[xSum][ySum].isPassable = false;
            map.fields[this.x][this.y].player = null;
            map.fields[this.x][this.y].isPassable = true;

            this.x = xSum;
            this.y = ySum;
        } else {
            console.log('rejected player movement', xSum, ySum)
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
                    objectToPush.player = (this.fields[x + xFrom][y + yFrom].player === null ? null : { x: this.fields[x + xFrom][y + yFrom].player.x, y: this.fields[x + xFrom][y + yFrom].player.y });
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
        this.map = new Map(64, 64);
        this.isServerOnline = false;
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
            this.players[socket.id] = this.addPlayer(socket);

            socket.on('disconnect', () => {
                this.removePlayer(this.players[socket.id]);
                delete this.players[socket.id];
            });

            socket.on('move player', data => {
                this.players[socket.id].move(this.map, data.xTransition, data.yTransition);
            });
        });
    }
};

const game = new Game();
game.start();