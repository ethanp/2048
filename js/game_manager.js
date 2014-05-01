// not sure how this became something you can create with the `new GameManager` keyword, but it is one
// In "application.js", this is called like
//
//   new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
//
// Where each of these passed in things are defined in this directory
// using snake_case_title.js
//
function GameManager(size, InputManager, Actuator, StorageManager) {
    this.size = size; // Size of the grid
    this.inputManager = new InputManager;  // create an instance of the InputManager type passed in
    this.storageManager = new StorageManager;
    this.actuator = new Actuator;

    this.startTiles = 2;

    // * adds { event_name : callback_function } to the inputManager
    // * I think we must bind the method to 'this' because the method is defined on the 'prototype',
    //    so normally, using 'this' within the method would refer to the 'GameManager prototype object', when we
    //    actually want it to refer to this particular 'GameManager instance'
    // * So in sum, we're telling this GameManager instance's inputManager that when we move (etc.), it should
    //    call the move method defined on the GameManager prototype, with the `this` keyword set to the instance.
    this.inputManager.on("move", this.move.bind(this));
    this.inputManager.on("restart", this.restart.bind(this));
    this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

    this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
    this.storageManager.clearGameState();
    this.actuator.continueGame(); // Clear the game won/lost message
    this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
    this.keepPlaying = true;
    this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
    return this.over || (this.won && !this.keepPlaying);
};

GameManager.prototype.setup = function () {
    var previousState = this.storageManager.getGameState();

    // Reload the game from a previous game if present
    if (previousState) {

        // Reload Grid from local_storage_manager.js (uses localStorage if it's available)
        this.grid = new Grid(previousState.grid.size, previousState.grid.cells);
        this.score = previousState.score;
        this.over = previousState.over;
        this.won = previousState.won;
        this.keepPlaying = previousState.keepPlaying;
    }

    // Otw create a new game
    else {
        this.grid = new Grid(this.size); // create an empty Grid
        this.score = 0;
        this.over = false;         // whether there are no moves available
        this.won = false;          // whether player got to 2048 tile
        this.keepPlaying = false;  // whether game continues after winning

        // Add the initial random 2 tiles
        this.addStartTiles();
    }

    // Update the actuator
    this.actuate();
};

// Set up the initial 2 random tiles to start the game with
GameManager.prototype.addStartTiles = function () {
    for (var i = 0; i < this.startTiles; i++) {
        this.addRandomTile();
    }
};

/**
 * Add a (90% chance 2, 10% chance 4) tile in a random empty position (if there is one)
 */
GameManager.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4; // 90% chance of 2, 10% chance of 4
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {

    // update the best-score box if need-be
    if (this.storageManager.getBestScore() < this.score) {
        this.storageManager.setBestScore(this.score);
    }

    // Clear the state when the game is over (over means user lost)
    if (this.over) this.storageManager.clearGameState();

    // if the game's not over, store its state in the local_storage_manager
    else this.storageManager.setGameState(this.serialize());

    // tell actuator to perform HTML update
    this.actuator.actuate(this.grid, {
        score: this.score,
        over: this.over,
        won: this.won,
        bestScore: this.storageManager.getBestScore(),
        terminated: this.isGameTerminated()
    });

};

/**
 * Serialize the current game state to a Javascript object
 */
GameManager.prototype.serialize = function () {
    return {
        grid: this.grid.serialize(),
        score: this.score,
        over: this.over,
        won: this.won,
        keepPlaying: this.keepPlaying
    };
};

/**
 * Save all tile positions and remove merger info
 */
GameManager.prototype.prepareTiles = function () {

    // we don't have a list of all the actual tiles in the game,
    // so we must sift through the Grid looking for them
    this.grid.eachCell(function (x, y, tile) {
        if (tile) {
            tile.mergedFrom = null;
            tile.savePosition();  // save tile's position into tile.previousPosition
        }
    });
};

/**
 * Move tiles on the grid in the specified direction
 * called by the keyboard_input_manager upon user-action
 */
GameManager.prototype.move = function (direction) {

    // Directions key:
    // 0: up, 1: right, 2: down, 3: left

    // 'this' will be re-bound in the forEach loop
    var self = this;

    if (this.isGameTerminated()) return; // Don't do anything if the game's over

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    // Save the current tile positions and remove merger information
    this.prepareTiles();

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {     // Note: he doesn't use "for y in traversals.y"
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell); // either a Tile or null

            // TODO this is where I left off
            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal? No!
                // It doesn't happen like that in the game (I tested it)
                // A Game Design Choice!
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    self.score += merged.value;

                    // The mighty 2048 tile. Change this to actually win.
                    if (merged.value === 2048) self.won = true;
                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });

    if (moved) {
        this.addRandomTile();

        if (!this.movesAvailable()) {
            this.over = true; // Game over!
        }

        this.actuate();
    }
};

/**
 * Move a tile and its representation
 * Used in move() above
 */
GameManager.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

/**
 * Get the vector representing the chosen direction (very clean way of mapping it)
 */
GameManager.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

GameManager.prototype.buildTraversals = function (vector) {

    // traversals = { x: [0,1,2,3], y: [0,1,2,3] }
    var traversals = { x: [], y: [] };
    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    // **This will determine the priority of the blocks smashing into each other!**
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
        this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

GameManager.prototype.movesAvailable = function () {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
    var self = this;

    var tile;

    for (var x = 0; x < this.size; x++) {
        for (var y = 0; y < this.size; y++) {
            tile = this.grid.cellContent({ x: x, y: y });

            if (tile) {
                for (var direction = 0; direction < 4; direction++) {
                    var vector = self.getVector(direction);
                    var cell = { x: x + vector.x, y: y + vector.y };

                    var other = self.grid.cellContent(cell);

                    if (other && other.value === tile.value) {
                        return true; // These two tiles can be merged
                    }
                }
            }
        }
    }

    return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};
