const socket = io();

const sendLoginFormData = () => {
    const login = document.getElementById('login-input').value;
    const password = document.getElementById('password-input').value;
    socket.emit('login', {login: login, password: password});
};
const form = document.getElementById('login-form');
form.addEventListener('submit', event => {
    console.log('form submit')
    event.preventDefault();
    sendLoginFormData();
});

class Game {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.state = null;
        this.tileSide = 40;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.playerId = '';
    }
    start() {
        socket.on('player id', playerId => {
            console.log('player id', playerId)
            this.playerId = playerId;
        });
        socket.on('credential rejected', () => {
            console.log('credential rejected')
        });
        socket.on('state update', state => {
            this.drawState(JSON.parse(state));
        });
        this.initArrows();
    }
    drawState(state) {
        this.state = state;
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        for (let x = 0; x < this.state.length; x++) {
            for (let y = 0; y < this.state[x].length; y++) {
                if (!this.state[x][y]) {
                    if (typeof this.state[x][y] === 'undefined') {
                        this.colorField(x, y, 'rgba(255, 0, 0, .25)');
                    } else if (this.state[x][y] === null) {
                        this.colorField(x, y, 'rgba(0, 0, 0, .25)');
                    }
                    continue; 
                }

                this.colorField(x, y, 'rgba(0, 0, 255, 0.25)');
                const player = this.state[x][y].player;
                if (player !== null && player.id !== this.playerId) {
                    this.drawPlayer(x, y);
                }
            }
        }
        this.drawClientPlayer();
    }
    drawPlayer(x, y) {
        const halfTileSide = this.tileSide / 2;
        this.ctx.beginPath();
        this.ctx.arc((x+1)*this.tileSide - halfTileSide, (y+1)*this.tileSide - halfTileSide, halfTileSide, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    drawClientPlayer(x, y) {
        const halfTileSide = this.tileSide / 2;
        this.ctx.beginPath();
        this.ctx.arc(this.canvasWidth/2, this.canvasHeight/2, halfTileSide, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    colorField(x, y, color) {
        const previousFillStyle = this.ctx.fillStyle;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x*this.tileSide, y*this.tileSide, this.tileSide, this.tileSide);
        this.ctx.fillStyle = previousFillStyle;
    }
    movePlayer(xTranslation, yTranslation) {
        socket.emit('move player', { xTranslation: xTranslation, yTranslation: yTranslation })
    }
    initArrows() {
        window.addEventListener('keydown', event => {
            switch (event.key) {
                case 'ArrowUp':
                    this.movePlayer(0, -1);
                    break;
                case 'ArrowDown':
                    this.movePlayer(0, 1);
                    break;
                case 'ArrowLeft':
                    this.movePlayer(-1, 0);
                    break;
                case 'ArrowRight':
                    this.movePlayer(1, 0);
                    break;
            }
        });
    }
}
const canvas = document.getElementById('canvas');
const game = new Game(canvas);
game.start();