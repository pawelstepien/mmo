let socket = io();

const sendLoginFormData = () => {
    const login = document.getElementById('login-input').value;
    const password = document.getElementById('password-input').value;
    console.log(login, password)
    socket.emit('login', {login: login, password: password});
};
const form = document.getElementById('login-form');
form.addEventListener('submit', event => {
    event.preventDefault();
    sendLoginFormData();
});

const sendMessageFormData = event => {
    const message = document.getElementById('message-input');
    socket.emit('message', message.value);
    message.value = '';
};
const msgForm = document.getElementById('message-form');
msgForm.addEventListener('submit', event => {
    event.preventDefault();
    sendMessageFormData();
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

        this.allImagesAreLoaded = false;
        image.src = source;
    }
}

class Game {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.state = null;
        this.accountData = null;
        this.tileSide = 32;
        canvas.width = 32 * 17;
        canvas.height = 32 * 17;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.graphics = new Graphics;
    }
    loadAssets() {
        this.graphics.loadImage('./assets/sprites/tiles/grass.png', 'grass');
        this.graphics.loadImage('./assets/sprites/tiles/lava.png', 'lava');
        this.graphics.loadImage('./assets/sprites/characters/mage.png', 'mage');

        for(let i = 1; i <= 7; i++) {
            this.graphics.loadImage(`./assets/sprites/tiles/grass_${i}.png`, 'grass_' + i);
        }
    }
    loadTileSet() {
        fetch('tile_set.json')
        .then(res => res.json())
        .then(assets => {
            assets.forEach(asset => this.graphics.loadImage(asset.source, asset.name));
        })
    }
    start() {
        this.loadTileSet();
        socket.on('login', accountData => {
            console.log('accountData', accountData)
            this.accountData = accountData;
            this.updateUiForLoggedInPlayer();
        });
        socket.on('disconnect', () => {
            this.updateUiForLoggedOutPlayer();
            console.log('disconnect')
        });
        socket.on('credential rejected', () => {
            console.log('credential rejected')
        });
        socket.on('state update', state => {
            this.drawState(JSON.parse(state));
        });
        this.initArrows();
        this.initAttackOnClick();
    }
    updateUiForLoggedInPlayer() {
        const loginForm = document.getElementById('login-form');
        const messageForm = document.getElementById('message-form');

        loginForm.classList.add('hide');
        messageForm.classList.remove('hide');
    }
    updateUiForLoggedOutPlayer() {
        const loginForm = document.getElementById('login-form');
        const messageForm = document.getElementById('message-form');
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        loginForm.classList.remove('hide');
        messageForm.classList.add('hide');
    }
    drawState(state) {
        this.state = state;
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        let nextLayerActions = [];
        
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
                if (this.state[x][y].type) {
                    this.drawImage(this.state[x][y].type, x, y);
                }
                
                const player = this.state[x][y].player;
                if (this.state[x][y].messages.length > 0) {   
                    nextLayerActions.push({drawMessages: {x: x, y: y, messages: this.state[x][y].messages}})
                }
                
                if (player) {
                    this.drawPlayer(x, y, player.sprite);
                    nextLayerActions.push({drawHealthBar: {x: x, y: y, percent: player.health}})
                    nextLayerActions.push({drawPlayerName: {x: x, y: y, name: player.name}})
                }
            }
        }
        nextLayerActions.forEach(action => {
            this[Object.keys(action)[0]](...Object.values(Object.values(action)[0]));
        })
    };
    drawHealthBar(x, y, percent) {
        const halfTileSide = this.tileSide / 2;
        this.ctx.fillStyle = `rgb(${255-Math.round(percent/100*255)}, ${0+Math.round(percent/100*255)}, 0)`;
        this.ctx.fillRect(x*this.tileSide, y*this.tileSide - 2, this.tileSide * percent/100, 3);
    }
    drawPlayerName(x, y, name) {
        const halfTileSide = this.tileSide / 2;
        this.ctx.fillStyle = 'yellow';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(name, x*this.tileSide + halfTileSide, y*this.tileSide -4);
    }
    drawMessages(x, y, messages) {
        console.log('this.drawMessages', x, y, messages)
        const halfTileSide = this.tileSide / 2;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        messages.reverse().forEach((message, index) => {
            if (message.player === 'damage') {
                this.ctx.fillStyle = 'red';
                this.ctx.fillText(message.message, x*this.tileSide + halfTileSide, y*this.tileSide - halfTileSide - 12*index);
                return;
            }
            this.ctx.fillStyle = 'white';
            this.ctx.fillText((message.player+': '+message.message), x*this.tileSide + halfTileSide, y*this.tileSide - halfTileSide - 12*index);
        });
    }
    drawPlayer(x, y, sprite) {
        const halfTileSide = this.tileSide / 2;
        this.ctx.drawImage(this.graphics.assets.images.mage, x*this.tileSide, y*this.tileSide);
    }
    drawClientPlayer() {
        const halfTileSide = this.tileSide / 2;
        this.ctx.drawImage(this.graphics.assets.images.mage, this.canvasWidth/2 - halfTileSide, this.canvasHeight/2 - halfTileSide);
        
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

    initAttackOnClick() {
        canvas.addEventListener('click', event => {
            const x = Math.floor(event.clientX / this.tileSide);
            const y = Math.floor(event.clientY / this.tileSide);
            if(this.state[x][y].player) {
                socket.emit('attack player', this.state[x][y].player)
            }
        });
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
        [].slice.call(document.querySelectorAll('.arrow')).forEach(arrow => {
            arrow.addEventListener('click', () => {
                switch (true) {
                    case arrow.classList.contains('arrow-up'):
                        this.movePlayer(0, -1);
                        break;
                    case arrow.classList.contains('arrow-down'):
                        this.movePlayer(0, 1);
                        break;
                    case arrow.classList.contains('arrow-left'):
                        this.movePlayer(-1, 0);
                        break;
                    case arrow.classList.contains('arrow-right'):
                        this.movePlayer(1, 0);
                        break;
                }
            })
        })
    }
}
const canvas = document.getElementById('canvas');
const game = new Game(canvas);
game.start();