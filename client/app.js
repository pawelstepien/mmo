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

class Graphics {
    constructor() {
        this.assets = {images: {}, spritesheets: {}};
        this.allImagesAreLoaded = true;
        this.imagesLoaded = 0;
    }
    loadImage(source, name) {
        const image = new Image();

        image.addEventListener('load', () => {
            this.assets.images[name] = image;
            this.imagesLoaded++;
            if (this.imagesLoaded === Object.keys(this.assets.images).length) {
                this.allImagesAreLoaded = true;
            }
        });

        this.allAssetsLoaded = false;
        image.src = source;
    }
}

class Game {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.state = null;
        this.tileSide = 32;
        canvas.width = 32 * 17;
        canvas.height = 32 * 17;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.playerId = '';
        this.graphics = new Graphics;
    }
    loadAssets() {
        this.graphics.loadImage('./assets/sprites/tiles/grass.png', 'grass');
        this.graphics.loadImage('./assets/sprites/tiles/lava.png', 'lava');
        this.graphics.loadImage('./assets/sprites/characters/mage.png', 'mage');
    }
    start() {
        this.loadAssets();
        //login
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
                        this.drawImage('lava', x, y);
                    } else if (this.state[x][y] === null) {
                        this.drawImage('lava', x, y);
                    }
                    continue; 
                }

                this.drawImage('grass', x, y);
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
        this.ctx.drawImage(this.graphics.assets.images.mage, x*this.tileSide, y*this.tileSide);
        this.ctx.stroke();
    }
    drawClientPlayer() {
        const halfTileSide = this.tileSide / 2;
        this.ctx.beginPath();
        this.ctx.drawImage(this.graphics.assets.images.mage, this.canvasWidth/2 - halfTileSide, this.canvasHeight/2 - halfTileSide);
        this.ctx.stroke();
    }
    colorField(x, y, color) {
        const previousFillStyle = this.ctx.fillStyle;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x*this.tileSide, y*this.tileSide, this.tileSide, this.tileSide);
        this.ctx.fillStyle = previousFillStyle;
    }
    drawImage(name, x, y) {
        this.ctx.drawImage(this.graphics.assets.images[name], x*this.tileSide, y*this.tileSide);
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