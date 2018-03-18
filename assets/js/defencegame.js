class DefenceGame {
    
    constructor(tileWidth, tileHeight, width, height, map, waypointData, game, model) {
        
        this.game = game;
        this.twidth = tileWidth || 16;
        this.theight = tileHeight || 16;
        this.width = width;
        this.height = height;
        
        this.map = map;
        this.waypointData = waypointData;
        this.model = model;
        this.mapMeta = tinydefence.maps[this.model.currentMapIndex];

        this.towermap = new Array(map.length);
        this.towers = [];
        
        this.enemies = [];

        this.waypoints = getWaypoints(this.mapMeta.start, this.mapMeta.end, this);

        this.selector = this.game.add.sprite(0, 0, 'selection');
        this.selector.scale.setTo(tinydefence.scalefactor, tinydefence.scalefactor);
        this.game.physics.arcade.enable(this.selector, Phaser.Physics.ARCADE);
        
        this.animation = this.selector.animations.add('idle', [0, 1], 8, true);
        this.selector.animations.play('idle');

        this.wasButtonDown = false;
    }

    addTower(tower, x, y) {
        this.set(tower, x, y, this.towermap);
        this.towers.push(tower);
    }

    addEnemy(health, enemySpeed, points, type) {
        let enemy = new Enemy(this.game, this.waypoints, type);
        enemy.maxhealth = health || enemy.sprite.health;
        enemy.sprite.health = enemy.maxhealth;
        enemy.speed = enemySpeed || enemy.speed;
        enemy.points = points || enemy.points;
        enemy.onTargetReached(() => this.model.lives -= 1);
        this.enemies.push(enemy);
    }

    update() {
        // Get mouse position on tilemap
        let cursor = this.getCursor();
        let x = cursor.x;
        let y = cursor.y;
        
        // Draw selector for free fields
        this.drawSelector(x, y);
        this.checkInput(x, y);

        // Update towers
        this.towers.forEach(t => {
            if(t.focusedEnemy === undefined) {
                t.searchForEnemy(this.enemies);
            }
            t.update();
        });

        // Look for hovered tower
        let selectedTower = this.get(x, y, this.towermap);
        if(selectedTower !== undefined) {
            selectedTower.onHover();
        }
        // Look for free field
        else if (this.isFieldFree(x, y))
        {
            tinydefence.game.ui.setPrice('50');
        }
        else
        {
            tinydefence.game.ui.setPrice(null);
        }

        // Update enemies
        this.enemies.filter(e => e.sprite.health <= 0.0).forEach(e => {
            e.die();
            this.model.money += e.points;
        });
        this.enemies = this.enemies.filter(e => e.sprite.health > 0.0 && e.targetReached === false);
        this.enemies.forEach(e => e.update());
    }

    checkInput(x, y) {
        if(this.game.input.pointer1.isDown || this.game.input.mousePointer.isDown) {
            this.wasButtonDown = true;
        } else {
            if(this.wasButtonDown) {
                this.onClick(x, y);
                this.wasButtonDown = false;
            }
        }
    }

    onClick(x, y) {
        if(this.isFieldFree(x, y)) {
            let tower = new Tower(this.game, x * this.twidth, y * this.twidth);

            if(this.model.money >= tower.getPrice(tower.tier)) {
                console.log("Buy new tower");
                tower.build();
                this.addTower(tower, x, y);
                this.model.money -= tower.getPrice(tower.tier);
            } else {
                console.log("Not enougth money");
                tower = {};
            }
        }
        else if (this.isTower(x, y)) {
            let tower = this.get(x, y, this.towermap);
            if(this.model.money >= tower.getPrice(tower.tier + 1) && tower.tier < tower.maxTier) {
                console.log("Buy tower upgrade");
                tower.upgrade();
                this.model.money -= tower.getPrice(tower.tier);
            } else {
                console.log("Not enougth money");
            }
        }
    }

    drawSelector(x, y) {
        if(this.isFieldFree(x, y) || this.isTower(x, y)) {
            this.selector.visible = true;
            this.selector.body.x = x*this.twidth;
            this.selector.body.y = y*this.theight;
        }
         else {
            this.selector.visible = false;
        }
    }

    isTower(x, y) {
        let tower = this.get(x, y, this.towermap);
        return tower !== undefined;
    }

    isFieldFree(x, y) {
        let tile = this.get(y, x, this.waypointData);
        let tower = this.get(x, y, this.towermap);
        return !(tile !== 0 || tower !== undefined);
    }

    getTile(x, y, map) {
        return this.get(y, x, map);
    }

    get(x, y, map) {
        return map[x*this.width + y];
    }

    set(value, x, y, map) {
        map[x*this.width + y] = value;
    }

    getCursor() {
        let x = Math.floor((this.game.input.x * this.game.scale.parentScaleFactor.x) / (this.twidth));
        let y = Math.floor((this.game.input.y * this.game.scale.parentScaleFactor.y) / (this.theight)); 
        // Contraints
        x = x >= this.width ? this.width-1 : x; 
        y = y >= this.height ? this.height-1 : y; 

        return {x: x, y: y};
    }
}