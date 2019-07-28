class Editor {
    constructor() {
        this.canvas = document.getElementById('editor-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.cameraX = 0;
        this.cameraY = 0;
        this.tileSide = 32;
        this.map = null;
        this.tileSet = null;
        this.assets = { images: {}, spritesheets: {} };
        this.allImagesAreLoaded = true;
        this.imagesLoaded = 0;
        this.currentBrush = null;
        this.palette = document.getElementById('palette');
        this.addToTileSetInput = document.getElementById('add-tile-source-input');
        this.addToTileSetSubmit = document.getElementById('add-tile-source-button');
        this.addToTileSetSelect = document.getElementById('add-tile-layer-select');
        this.tileMapDownloadAnchor = document.getElementById('tile-map-download-anchor');
        this.tileSetDownloadAnchor = document.getElementById('tile-set-download-anchor');
    }

    drawMap(map, cameraX, cameraY) {
        const fromX = cameraX;
        const fromY = cameraY;
        let toX = cameraX + Math.floor(this.canvas.width/this.tileSide);
        let toY = cameraY + Math.floor(this.canvas.height/this.tileSide);
        // toX = toX > map.length - 1 ? map.length - 1 : toX;
        // toY = toY > map[0].length - 1 ? map.length - 1 : toY;
        console.log('drawMap',fromX, toX)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        for(let x = fromX; x < toX; x++) {
            // if (!map[x]) continue;
            for(let y = fromY; y < toY; y++) {
                console.log('aa', map, x, y)
                this.drawImage(
                    map[x] && map[x][y] && map[x][y].surface ? 
                    map[x][y].surface : null, 
                    x*this.tileSide - cameraX*this.tileSide, y*this.tileSide - cameraY*this.tileSide);

                if(map[x] && map[x][y] && map[x][y].structure) {
                    this.drawImage(map[x][y].structure, x*this.tileSide - cameraX*this.tileSide, y*this.tileSide - cameraY*this.tileSide);
                } 
            }
        }
    }
    moveCameraOnArrows() {
        window.addEventListener('keydown', event => {
            console.log('keydown')
            switch (event.key) {
                case 'ArrowUp':
                    this.cameraY--;
                    break;
                case 'ArrowDown':
                    this.cameraY++;
                    break;
                case 'ArrowLeft':
                    this.cameraX--;
                    break;
                case 'ArrowRight':
                    this.cameraX++;
                    break;
            }
            this.drawMap(this.map, this.cameraX, this.cameraY)
        });
    }
    drawMouseHover(x, y) {
        this.drawMap(this.map, this.cameraX, this.cameraY);
        this.ctx.strokeStyle = 'yellow';
        this.ctx.strokeRect(x*this.tileSide, y*this.tileSide, this.tileSide, this.tileSide);
    }

    changeTile(name, x, y) {
        // console.log(this.map[x][ y])
        if (!this.map[x]) {
            this.map[x] = [];
        }

        this.map[x][y][this.addToTileSetSelect.value] = name;

        console.log(this.map[x][y])
        this.drawMap(this.map, this.cameraX, this.cameraY);
    }
    drawImage(name, x, y) {
        if (!this.assets.images[name]) {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(x, y, this.tileSide, this.tileSide);
            return;
        }
        this.ctx.drawImage(this.assets.images[name], x, y)
    }
    changeBrush(event) {
        const images = [].slice.call(document.querySelectorAll('#palette img'));
        images.forEach(image => {
            image.parentElement.classList.remove('active');
            if (event.target === image) {
                image.parentElement.classList.add('active');
                console.log('change brush', image.dataset.name)
                console.log(this)
                this.currentBrush = image.dataset.name;
            }
        });
    }
    loadImage(source, name) {
        const image = new Image();

        image.addEventListener('load', () => {
            this.assets.images[name] = image;
            this.imagesLoaded++;
            if (this.imagesLoaded === Object.keys(this.assets.images).length) {
                this.allImagesAreLoaded = true;
            }
            this.ctx.drawImage(image, 0, 0);
            const figure = document.createElement('figure');
            const caption = document.createElement('figcaption');
            const clone = image.cloneNode();

            figure.insertAdjacentElement('beforeend', clone);
            figure.insertAdjacentElement('beforeend', caption);

            clone.addEventListener('click', this.changeBrush.bind(this));
            clone.alt = name;
            clone.dataset.name = name;
            caption.textContent = name;
            caption.contentEditable = true;
            caption.addEventListener('input', event => {
                this.assets.images[event.target.textContent] = clone;
                delete this.assets.images[clone.dataset.name];
                clone.dataset.name = event.target.textContent;
                console.log(event)
            })

            this.palette.insertAdjacentElement('beforeend', figure);
        });

        this.allImagesAreLoaded = false;
        image.src = source;
    }
    getTileSet() {
        console.log('getTileSet', this.assets.images)
        return Object.keys(this.assets.images).map(key => {
            const source = this.assets.images[key].getAttribute('src');
            return {name: key, source: source};
        })
    }
    addToTileSet(source) {
        console.log(source.match(/\/([\w\d]+)\.png/i)[1])
        this.loadImage(source, source.match(/\/([\w\d]+)\.png/i)[1]);
    }
    removeFromTileSet(name) {
        delete this.assets.images[name];
    }
    listenForTileSetChanges() {
        this.addToTileSetSubmit.addEventListener('click', () => {
            if (this.addToTileSetInput.value && this.addToTileSetInput.value.length > 0) {
                this.addToTileSet(this.addToTileSetInput.value)
            }
        });
    }
    setDownloadAnchor(anchor, data) {
        console.log('setDownloadAnchor', data)
        anchor.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));
    }
    listenForDownload(anchor, propertyName) {
        anchor.addEventListener('click', event => {
            this.setDownloadAnchor(anchor, typeof this[propertyName] === 'function' ? this[propertyName]() : this[propertyName]);
            if (event.isTrusted) {
                anchor.click();
                event.preventDefault();
                return false;
            }
        });
        
    }
    listenForMouseActions() {
        let lastHoverX = 0;
        let lastHoverY = 0;
        this.canvas.addEventListener('mousemove', event => {
            const currentHoverX = Math.floor(event.offsetX/this.tileSide);
            const currentHoverY = Math.floor(event.offsetY/this.tileSide);
            if (currentHoverX !== lastHoverX || currentHoverY !== lastHoverY) {
                this.drawMouseHover(currentHoverX, currentHoverY);
                lastHoverX = currentHoverX;
                lastHoverY = currentHoverY;
            }
        })
        this.canvas.addEventListener('click', event => {
            const x = Math.floor(event.offsetX/this.tileSide) + this.cameraX;
            const y = Math.floor(event.offsetY/this.tileSide) + this.cameraY;
            this.changeTile(this.currentBrush, x, y);
        })
    }
    listenForFileInputChange() {

        const onTileSetChange = event => {
            const reader = new FileReader();
            reader.onload = onTileSetReaderLoad.bind(this);
            reader.readAsText(event.target.files[0]);
        }

        const onTileMapChange = event => {
            const reader = new FileReader();
            reader.onload = onTileMapReaderLoad.bind(this);
            reader.readAsText(event.target.files[0]);
        }

        const onTileSetReaderLoad = event => {
            const assets = JSON.parse(event.target.result);
            assets.forEach(asset => {
                this.loadImage(asset.source, asset.name);
            });
            console.log('lala', this)
        };
        const onTileMapReaderLoad = event => {
            const tiles = JSON.parse(event.target.result);
            this.map = tiles;
            this.drawMap(this.map, this.cameraX, this.cameraY);
            this.listenForMouseActions();
            this.moveCameraOnArrows.bind(this)();
        }
        document.getElementById('tile-set-input').addEventListener('change', onTileSetChange.bind(this));
        document.getElementById('tile-map-input').addEventListener('change', onTileMapChange.bind(this));
    };
}

const editor = new Editor();
editor.listenForFileInputChange();
editor.listenForDownload(editor.tileMapDownloadAnchor, 'map');
editor.listenForDownload(editor.tileSetDownloadAnchor, 'getTileSet');
editor.listenForTileSetChanges();