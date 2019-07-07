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
        if (map[x + xTransition][y + yTransition].isPassable) {
            this.x = x + xTransition;
            this.y = y + yTransition;
        }
    }
    sendState(state) {
        // console.log('senind state', state)
        console.log('before stringify')
        let cache = [];
        // const stringifiedState = JSON.stringify(state, (key, value) => {
        //     if (typeof value === 'object' && value !== null) {
        //         if (cache.indexOf(value) !== -1) {
        //             // Duplicate reference found, discard key
        //             return;
        //         }
        //         // Store value in our collection
        //         cache.push(value);
        //     }
        //     return value;
        // });
        const stringifiedState = JSON.stringify(state);

        cache = null; // Enable garbage collection
        console.log('emiting stringified state', stringifiedState.length)
        this.socket.emit('state update', stringifiedState);
    }
    removePlayer() {
        console.log('remove player', map[x][y].player.id)
        if (map[x][y].player === this) {
            map[x][y].player = null;
        }
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
                // console.log(x+xFrom-1, y+yFrom-1)
                data[x][y] = null;
                if (!(x + xFrom < 0 || y + yFrom < 0 || x + xTo > this.width || y + yTo > this.height)) {
                    const objectToPush = {};
                    objectToPush.player = (this.fields[x + xFrom][y + yFrom].player === null ? null : {x : this.fields[x + xFrom][y + yFrom].player.x, y : this.fields[x + xFrom][y + yFrom].player.y});
                    objectToPush.isPassable = this.fields[x + xFrom][y + yFrom].isPassable;
                    data[x][y] = objectToPush;
                    console.log('lala', objectToPush)
                }
            }
        }
        console.log('data')
        return data;
    }

}

class Game {
    constructor() {
        this.players = {};
        this.map = new Map(41, 41);
        this.isServerOnline = false;
    }
    addPlayer(socket) {
        let x, y;
        do {
            x = Math.floor(Math.random() * 6 /*this.map.width */);
            y = Math.floor(Math.random() * 6 /*this.map.height */);
        } while (!this.map.fields[x][y].isPassable || this.map.fields[x][y].player !== null);
        const player = new Player(socket, x, y);
        this.map.fields[x][y].player = player;
        this.map.fields[x][y].isPassable = false;
        return player;
    }
    sendStateToPlayers() {
        const playersKeys = Object.keys(this.players || {}); //?
        console.log('sending state to players')
        if (playersKeys.length === 0) {
            return;
        }
        playersKeys.forEach(key => {
            const player = this.players[key];
            const state = this.map.getData(player.x - 5, player.y - 5, player.x + 5, player.y + 5);
            player.sendState(state);
        });
    };
    start() {
        this.isServerOnline = true;
        setInterval(this.sendStateToPlayers.bind(this), 1000);

        io.on('connection', socket => {
            
            this.players[socket.id] = this.addPlayer(socket);
            console.log('player connected', this.players[socket.id].x, this.players[socket.id].y)

            io.on('disconnect', socket => {
                console.log('disconnect event', socket)
                delete this.players[socket.id];
                this.players[socket.id].removePlayer();
            });
        });


    }
};

const game = new Game();
game.start();