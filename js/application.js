//
// requestAnimationFrame: requests that the browser call the provided function
//                        to update an animation before the next repaint.
// This kicks the game off!
//
window.requestAnimationFrame(function () {
    new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
});
