var socket;
var exceptions = []
var stateReceived = false;
let lockInfo = {};
var gameVars;
var lastStats = [];
var buffer = [];
var emitFlag = false;
var prevState = [];

function init() {
    // $('#passages').html($('#passages').html().replace(/<br><br>/gm, ""));

    // console.log(Window.SugarCubeState.passage);
    // prevState = Object.assign({}, Window.SugarCubeState.variables);
    // console.log(prevState);
    $("body").addClass("blur")
    $("body").one("click", () => {
        $("body").removeClass("blur")
    });
    // setInterval(checkDif, 1000)
}


$(document).on(':passagestart', (ev) => {
    init()

})

function fullReset() {
    console.log("reset start")
    socket.emit('fullReset', '');
}

function DOMTest() {
    setTimeout({})
    return $("#passages").children()[0].innerHTML
}


// Returns the role of the current player
function getUser() {
    let userId = Window.SugarCubeState.getVar("$role");
    let user = Window.SugarCubeState.getVar("$users")[userId];
    return user;
}


//Creates a handler for the state proxy, maintains entire path of var getting set for emitting to webstack
function createHandler(path = []) {
    return {
        get(target, key) {
            if (path.length == 0 && key != `variables`) {
                return target[key];
            }
            if (typeof target[key] === 'object' && Array.isArray(target[key]) == false && target[key] !== null) {
                return new Proxy(target[key], createHandler([...path, key]))
            } else {
                return target[key];
            }
        },
        set(target, key, value) {
            if (target[key] != value) {
                // prevState = Object.assign({}, target);
                console.log("set: ", key, value);
                target[key] = value
                path.shift();
                emitNewVars(key, value);
            }
            return true
        }
    }
}

function emitNewVars(key, value) {
    if (emitFlag && key !== "nick" && key !== "userId") {
        console.log(key, value);
        let newState = {};
        newState[key] = value;
        userData.gameState[key] = value;
        socket.emit('newState', newState);
        $(document).trigger(":liveupdate");
    }
}

function initTheyr(lockInfo) {
    $(document).on(":storyready", function() {
        console.log("SugarCube has fully initialized!");
        updateSugarCubeState(userData.gameState);
        emitFlag = true;
    });
    
    socket = io();
    // Receive state from server upon connecting, then update all other clients that you've connected
    socket.on('connect', () => {
        console.log("socket.id: ", socket.id);
        socket.emit('new user', socket.id);
        console.log(lockInfo)
        lockInfo.callback(lockInfo.lockId);
        console.log("lockscreen unlocked");
    })
    // Incoming difference, update your state and store
    socket.on('difference', (diff) => {
        console.log("got a difference");
        console.log("updating sugarcube", diff);
        updateSugarCubeState(diff)
        _.merge(buffer, diff)
        $(document).trigger(":liveupdate");
    });

    socket.on('reset', (diff) => {
        console.log("reseting sugarcube", diff);
        resetSugarCubeState(diff)

        $(document).trigger(":liveupdate");
    });
}

// Updates client's SugarCube State when state changes are received from the server
function updateSugarCubeState(new_state) {
    console.log("New State: ", new_state);
    _.merge(Window.SugarCubeState.variables, new_state);

    $(document).trigger(":liveupdate");
}

// Updates client's SugarCube State when state changes are received from the server
function resetSugarCubeState(new_state) {
    for (var member in Window.SugarCubeState.variables) delete Window.SugarCubeState.variables[member];
    Window.SugarCubeState.variables.variables = new_state
    console.log(new_state, Window.SugarCubeState.variables)
    $(document).trigger(":liveupdate");
}

//Exceptions are global variables that shouldn't be shared between users
function addTheyrException(varName) {
    varName = varName.replace('State.variables.', '')
    console.log(varName)
    exceptions.push(varName);
}