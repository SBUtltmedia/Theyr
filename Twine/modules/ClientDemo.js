/**
 * Multiplayer Engine Demo - Client
 *
 * Simplified client for the multiplayer engine demonstration.
 * Handles Socket.IO communication and state synchronization.
 */

var socket;
var exceptions = ['$userId', '$god', '$godParam', '$passageHistory'];
var stateReceived = false;
var gameVars;

/**
 * Initialize client manually after Socket.IO is loaded
 */
window.initMultiplayerClient = function() {
    console.log("Multiplayer Engine Client Initializing...");
    if (typeof io === 'undefined') {
        console.error("Socket.IO not found. Ensure socket.io.js is loaded before initializing.");
        return;
    }
    initSocket();
    initFromURL();
};


/**
 * Initialize user from URL parameters
 */
function initFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (userId) {
        console.log(`Initializing user from URL: ${userId}`);
        if (window.SugarCube && window.SugarCube.State) {
            window.SugarCube.State.variables.userId = userId;
        }
    }
}

/**
 * Initialize Socket.IO connection
 */
function initSocket() {
    socket = io();
    window.socket = socket;

    socket.on('connect', () => {
        console.log('✓ Connected to multiplayer server');
        console.log('Socket ID:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('✗ Disconnected from server');
    });

    socket.on('difference', (difference) => {
        console.log('Received state update from server:', difference);
        updateSugarCubeState(difference);
    });

    socket.on('fullState', (state) => {
        console.log('Received full state from server');
        updateSugarCubeState(state);
        stateReceived = true;
    });

    // Handle 'new connection' from server (initial state)
    socket.on('new connection', (state) => {
        console.log('Received initial state from server (new connection)');
        updateSugarCubeState(state);
        stateReceived = true;
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    // Request initial state by announcing new user
    setTimeout(() => {
        // socket.emit('getState');
        socket.emit('new user', window.SugarCube.State.variables.userId || 'unknown');
    }, 100);
}

/**
 * Update SugarCube state with data from server
 * Filters out exception variables to prevent override
 */
function updateSugarCubeState(new_state) {
    // Check if SugarCube is initialized
    if (!window.SugarCube || !window.SugarCube.State || !window.SugarCube.State.variables) {
        console.warn('SugarCube not initialized yet, deferring state update');
        setTimeout(() => updateSugarCubeState(new_state), 100);
        return;
    }

    // Filter out exception variables from server state to prevent override
    const filteredState = {};
    for (const key in new_state) {
        // Check if this key is an exception variable (without $ prefix)
        const varName = '$' + key;
        if (!exceptions.includes(varName) && !exceptions.includes('$' + key)) {
            filteredState[key] = new_state[key];
        }
    }

    // Merge filtered state into SugarCube
    // Use jQuery's deep extend to replicate lodash's merge without the dependency
    $.extend(true, window.SugarCube.State.variables, filteredState);

    // Trigger liveupdate for any <<liveblock>> sections
    $(document).trigger(":liveupdate");
    $(document).trigger(":liveupdateinternal");
}

/**
 * Send state update to server
 * Called by the th-set macro
 */
function sendStateUpdate(variable, value) {
    if (!socket || !socket.connected) {
        console.warn('Socket not connected, cannot send update');
        return;
    }

    const updateData = {
        variable: variable,
        value: value,
        userId: window.SugarCube.State.variables.userId || 'unknown'
    };

    console.log('Sending state update:', updateData);
    socket.emit('stateUpdate', updateData);
}

/**
 * Send atomic math operation to server
 * Used for +=, -=, *= to prevent race conditions
 */
function sendAtomicUpdate(variable, operation, value) {
    if (!socket || !socket.connected) {
        console.warn('Socket not connected, cannot send atomic update');
        return;
    }

    const updateData = {
        variable: variable,
        operation: operation, // 'add', 'subtract', 'multiply', etc.
        value: value,
        userId: window.SugarCube.State.variables.userId || 'unknown'
    };

    // console.log('Sending atomic update:', updateData);
    socket.emit('atomicUpdate', updateData);
}

// Export for use in th-set macro
window.sendStateUpdate = sendStateUpdate;
window.sendAtomicUpdate = sendAtomicUpdate;

console.log('ClientDemo.js loaded');
