const socket = io();
class Game {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.state = null;
        this.tileSide = 40;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
    }
    start() {
        socket.on('state update', state => {
            console.log('state update')
            this.drawState(JSON.parse(state));
        });
    }
    drawState(state) {
        // if (this.state === state) return;
        this.state = state;
        this.ctx.clearRect(0,0,this.canvasWidth-1, this.canvasHeight-1);
        for (let x = 0; x < this.state.length; x++) {
            for (let y = 0; y < this.state[x].length; y++) {
                if (this.state[x][y] === null) continue;
                const player = this.state[x][y].player;
                    if (player !== null) {
                    this.drawPlayer(player.x, player.y);
                }
            }
        }
    }
    drawPlayer(x, y) {
        const halfTileSide = this.tileSide / 2;
        console.log('drawing player', x, y)
        this.ctx.beginPath();
        this.ctx.arc((x+1)*this.tileSide - halfTileSide, (y+1)*this.tileSide - halfTileSide, halfTileSide, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
}
const canvas = document.getElementById('canvas');
const game = new Game(canvas);
game.start();