function KeyboardInputManager() {
    this.events = {};

    // for handling touch events
    if (window.navigator.msPointerEnabled) {
        //Internet Explorer 10 style
        this.eventTouchstart = "MSPointerDown";
        this.eventTouchmove = "MSPointerMove";
        this.eventTouchend = "MSPointerUp";
    } else {
        this.eventTouchstart = "touchstart";
        this.eventTouchmove = "touchmove";
        this.eventTouchend = "touchend";
    }

    this.listen();
}

/** teach me how to dougie */
KeyboardInputManager.prototype.on = function (event, callback) {
    if (!this.events[event]) {
        this.events[event] = [];
    }
    this.events[event].push(callback);
};

// when an instance of this prototype emits something, it passes
// a string and data, then it looks up what GameManager function to
// call based on the string, and it calls that function and passes
// it an argument (e.g. for "move" it would be a direction, and
// for "restart" there is no argument)
KeyboardInputManager.prototype.emit = function (event, data) {
    var callbacks = this.events[event];
    if (callbacks) {
        callbacks.forEach(function (callback) {
            callback(data);
        });
    }
};

KeyboardInputManager.prototype.listen = function () {
    var self = this;

    var map = {
        38: 0, // Up
        39: 1, // Right
        40: 2, // Down
        37: 3, // Left
        75: 0, // Vim up   <== what a G. never woulda guessedit
        76: 1, // Vim right
        74: 2, // Vim down
        72: 3, // Vim left
        87: 0, // W
        68: 1, // D
        83: 2, // S
        65: 3  // A
    };

    // Respond to direction keys
    document.addEventListener("keydown", function (event) {

        // each of these happens [1] to be a bool, though we'd get a bool here regardless
        // [1] : http://english.stackexchange.com/questions/12387/each-with-plural-or-singular-verb
        var modifiers = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

        // event.which: the numeric charCode of the (alphanumeric) key pressed (in Unicode).
        // So we're turning the key pressed into: "mapped" in [0,1,2,3]
        var mapped = map[event.which];

        // call move() with the direction value
        if (!modifiers) {
            if (mapped !== undefined) {
                event.preventDefault();
                self.emit("move", mapped);
            }
        }

        // R key restarts the game
        if (!modifiers && event.which === 82) {
            self.restart.call(self, event);
        }
    });

    // Respond appropriately to user pressing each of the buttons on the screen
    this.bindButtonPress(".retry-button", this.restart);
    this.bindButtonPress(".restart-button", this.restart);
    this.bindButtonPress(".keep-playing-button", this.keepPlaying);

    // Respond to swipe events (like for a tablet)
    var touchStartClientX, touchStartClientY;
    var gameContainer = document.getElementsByClassName("game-container")[0];

    gameContainer.addEventListener(this.eventTouchstart, function (event) {

        // Ignore if touching with more than 1 finger
        if ((   !window.navigator.msPointerEnabled
            && event.touches.length > 1)
            || event.targetTouches > 1) {
            return
        }

        if (window.navigator.msPointerEnabled) {
            touchStartClientX = event.pageX;
            touchStartClientY = event.pageY;
        } else {
            touchStartClientX = event.touches[0].clientX;
            touchStartClientY = event.touches[0].clientY;
        }

        event.preventDefault();
    });

    gameContainer.addEventListener(this.eventTouchmove, function (event) {
        event.preventDefault();
    });

    gameContainer.addEventListener(this.eventTouchend, function (event) {

        // Ignore if still touching with one or more fingers
        if (   (!window.navigator.msPointerEnabled && event.touches.length > 0)
            || event.targetTouches > 0) {
            return;
        }

        var touchEndClientX, touchEndClientY;

        if (window.navigator.msPointerEnabled) {
            touchEndClientX = event.pageX;
            touchEndClientY = event.pageY;
        } else {
            touchEndClientX = event.changedTouches[0].clientX;
            touchEndClientY = event.changedTouches[0].clientY;
        }

        var dx = touchEndClientX - touchStartClientX;
        var absDx = Math.abs(dx);

        var dy = touchEndClientY - touchStartClientY;
        var absDy = Math.abs(dy);

        // If their swipe went far enough, count it as a move in the appropriate direction
        if (Math.max(absDx, absDy) > 10) {
            // (right : left) : (down : up)
            self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
        }
    });
};

KeyboardInputManager.prototype.restart = function (event) {
    event.preventDefault();
    this.emit("restart");
};

KeyboardInputManager.prototype.keepPlaying = function (event) {
    event.preventDefault();
    this.emit("keepPlaying");
};

KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {

    // select element using CSS-style selector
    // this is like $(selector), only it returns an "element" object, rather than a jQuery object
    var button = document.querySelector(selector);

    // addEventListener() is "more flexible than button.onclick" [MDN], bc
    //   1) it allows you to register multiple handlers for an event
    //   2) it can do stuff besides call a function? Maybe?
    // basically it is meant to *replace* onclick, so, I dunno, it's better
    button.addEventListener("click", fn.bind(this));

    // the touch device version of the "click" event
    button.addEventListener(this.eventTouchend, fn.bind(this));
};
