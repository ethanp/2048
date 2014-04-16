// an actuator is a motor responsible for moving a mechanism
// Look Ma, no jQuery!
/**
 * HTMLActuator object @constructor.
 * Sets the @properties we want the function to have,
 * then @returns a pointer to the object.
 * The HTMLActuator's class-methods are defined on its prototype beneath.
 */
function HTMLActuator() {

    // querySelector:
    // Returns the first element within the document
    // (using depth-first pre-order traversal of the document's nodes)
    // that matches the specified group of selectors.
    this.tileContainer    = document.querySelector(".tile-container");
    this.scoreContainer   = document.querySelector(".score-container");
    this.bestContainer    = document.querySelector(".best-container");
    this.messageContainer = document.querySelector(".game-message");

    this.score = 0;
}

/**
 * called from game_manager.js -> actuate() after each state-change
 * updates on-screen score and grid and does animations
 */
HTMLActuator.prototype.actuate = function (grid, metadata) {

    var self = this;  // for use in the forEach

    // requestAnimationFrame:
    // requests that the browser call a specified function
    // to update an animation before the next repaint.
    // In iOS I think this is called setNeedsDisplay or something.
    window.requestAnimationFrame(function () {

        // remove all children of tileContainer
        self.clearContainer(self.tileContainer);

        grid.cells.forEach(function (column) {
            column.forEach(function (cell) {
                if (cell) {
                    self.addTile(cell);
                }
            });
        });

        self.updateScore(metadata.score);
        self.updateBestScore(metadata.bestScore);

        if (metadata.terminated) {
            if (metadata.over) {
                self.message(false); // You lose
            } else if (metadata.won) {
                self.message(true); // You win!
            }
        }

    });
};


// TODO Could we also just say "a.b.newMethod = this.clearMessage" ?
//   perhaps that would leave us with a pointer to the original function
//   instead of method that calls the original function,
//   but practically, wouldn't they end up doing the same thing?
/** I think this just ensures that the end-of-game message doesn't pop up */
HTMLActuator.prototype.continueGame = function () { this.clearMessage(); };


/** remove all of the container's children */
HTMLActuator.prototype.clearContainer = function (container) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
};

/**
 * After the user hits a movement key, animate each tile
 */
HTMLActuator.prototype.addTile = function (tile) {

    // 'this' is whatever is *calling* this function
    // (unless they used apply/bind/call)
    var self = this;

    var wrapper = document.createElement("div");
    var inner = document.createElement("div");
    var position = tile.previousPosition || { x: tile.x, y: tile.y };
    var positionClass = this.positionClass(position);

    // We can't use classlist because it somehow glitches when replacing classes
    // tile.value is the number written on the tile
    // positionClass describes where it goes on the grid
    var classes = ["tile", "tile-" + tile.value, positionClass];

    // from main.scss, it looks like these ones glow gold
    // recall that classes is an array at this point,
    // not a string, so we can `push()` like that
    if (tile.value > 2048) classes.push("tile-super");

    // apply classes to wrapper (nicely done)
    this.applyClasses(wrapper, classes);

    // uses the included file "classlist_polyfill.js"
    // looks like it overrides some standard HTML5 function
    // TODO look-up what makes this version different

    // The normal version just tacks the type onto the element's space-separated list of classes
    inner.classList.add("tile-inner");

    // Gets or sets the text content of a node and its descendants.
    // @returns the concatenation of the textContent attribute value of every child node
    // Setting this property on a node removes all of its children
    //     and replaces them with a single text node with the given value.
    inner.textContent = tile.value;

    // if the tile has saved a location of where it used to be (which happens when we "move")
    if (tile.previousPosition) {
        // Make sure that the tile gets rendered in the previous position first
        // because we want it to *glide* to its new position, not be rendered already there
        window.requestAnimationFrame(function () {
            // set the tile's class to the new position
            classes[2] = self.positionClass({ x: tile.x, y: tile.y });

            // Update the position
            // Ostensibly, this is where the animation happens,
            // but I can't find that in main.scss anywhere
            self.applyClasses(wrapper, classes);
        });
    } else if (tile.mergedFrom) {
        // if the tile just merged with another one
        // apply the appropriate class to it.
        // uses the css property "animation" with a "pop",
        // I'd need an internet connection to see what that means
        classes.push("tile-merged");
        this.applyClasses(wrapper, classes);

        // Render the tiles that merged
        // Not really sure what's going on here
        // Recursive call on the tile we merged with?
        tile.mergedFrom.forEach(function (merged) {
            self.addTile(merged);
        });
    } else {
        // Tile clearly didn't exist before, so it must be new
        // So we apply the appropriate animation to it
        classes.push("tile-new");
        this.applyClasses(wrapper, classes);
    }

    // Put the inner <div> of the tile into the wrapper
    wrapper.appendChild(inner);

    // Put the tile on the board
    this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
    element.setAttribute("class", classes.join(" "));  // I like it
};

/**
 * I guess this switches from 0-index to 1-index
 */
HTMLActuator.prototype.normalizePosition = function (position) {
    return { x: position.x + 1, y: position.y + 1 };
};

/**
 * create a html class for the tile position,
 * both coordinates are 1-indexed
 * e.g. "tile-position-2-4"
 */
HTMLActuator.prototype.positionClass = function (position) {
    position = this.normalizePosition(position);
    return "tile-position-" + position.x + "-" + position.y;
};

/**
 * If they got points, create a <div> with position: absolute
 * and alpha: 0.9 with animation (move-up 600 ms) with the
 * text "+(scoreDifference)"
 */
HTMLActuator.prototype.updateScore = function (score) {

    this.clearContainer(this.scoreContainer); // remove any previous score updates

    var difference = score - this.score;
    this.score = score; // save the score

    this.scoreContainer.textContent = this.score; // update the score-box's text

    if (difference > 0) {
        var addition = document.createElement("div");
        addition.classList.add("score-addition");
        addition.textContent = "+" + difference;
        this.scoreContainer.appendChild(addition);
    }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
    this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won) {
    var type = won ? "game-won" : "game-over";
    var message = won ? "You win!" : "Game over!";

    this.messageContainer.classList.add(type);
    this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
    // IE only takes one value to remove at a time.
    this.messageContainer.classList.remove("game-won");
    this.messageContainer.classList.remove("game-over");
};
