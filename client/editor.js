class Graphics {
    constructor() {
        this.assets = { images: {}, spritesheets: {} };
        this.allImagesAreLoaded = true;
        this.imagesLoaded = 0;
        this.canvas = document.getElementById('editor-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.palette = document.getElementById('palette');
        this.downloadAnchor = document.getElementById('download-anchor');
        this.cameraX = 0;
        this.cameraY = 0;
        this.map = null;
        this.tileSide = 32;
        this.currentBrush = null;
    }

    drawMap(map, cameraX, cameraY) {
        const fromX = cameraX;
        const fromY = cameraY;
        let toX = cameraX + Math.floor(this.canvas.width/this.tileSide);
        let toY = cameraY + Math.floor(this.canvas.height/this.tileSide);
        toX = toX > map.length - 1 ? map.length - 1 : toX;
        toY = toY > map[0].length - 1 ? map.length - 1 : toY;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        for(let x = fromX; x < toX; x++) {
            if (!map[x]) continue;
            for(let y = fromY; y < toY; y++) {
                this.drawImage(map[x][y], x*this.tileSide - cameraX*this.tileSide, y*this.tileSide - cameraY*this.tileSide);
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
        console.log(this.map[x][y])
        if (!this.map[x]) {
            this.map[x] = [];
        }
        this.map[x][y] = name;
        console.log(this.map[x][y])
        this.drawMap(this.map, this.cameraX, this.cameraY);
    }
    drawImage(name, x, y) {
        this.ctx.drawImage(this.assets.images[name], x, y)
    }
    changeBrush(event) {
        const images = [].slice.call(document.querySelectorAll('#palette img'));
        images.forEach(image => {
            image.classList.remove('active');
            if (event.target === image) {
                image.classList.add('active');
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
            const clone = image.cloneNode();
            clone.addEventListener('click', this.changeBrush.bind(this));
            clone.dataset.name = name;
            this.palette.insertAdjacentElement('beforeend', clone);
        });

        this.allImagesAreLoaded = false;
        image.src = source;
    }
    setDownloadAnchor(data) {
        console.log('setDownloadAnchor', data)
        this.downloadAnchor.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));
    }
    listenForDownload() {
        this.downloadAnchor.addEventListener('click', event => {
            this.setDownloadAnchor(this.map);
            console.log(event.isTrusted)
            if (event.isTrusted) {
                this.downloadAnchor.click();
                event.preventDefault();
                return false;
            }
            
        });
        
    }
    listenForMouseActions() {
        let lastHoverX = 0;
        let lastHoverY = 0;
        this.canvas.addEventListener('mousemove', event => {
            const currentHoverX = Math.floor(event.clientX/this.tileSide);
            const currentHoverY = Math.floor(event.clientY/this.tileSide);
            if (currentHoverX !== lastHoverX || currentHoverY !== lastHoverY) {
                this.drawMouseHover(currentHoverX, currentHoverY);
                lastHoverX = currentHoverX;
                lastHoverY = currentHoverY;
            }
        })
        this.canvas.addEventListener('click', event => {
            const x = Math.floor(event.clientX/this.tileSide) + this.cameraX;
            const y = Math.floor(event.clientY/this.tileSide) + this.cameraY;
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
        }

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

const graphics = new Graphics();
graphics.listenForFileInputChange();
graphics.listenForDownload();