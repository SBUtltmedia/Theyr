var socket;
var exceptions = []
var stateReceived = false;
let lockInfo = {};
var gameVars;
var lastStats = [];
var buffer = [];
var emitFlag = false;

function init() {
    // $('#passages').html($('#passages').html().replace(/<br><br>/gm, ""));

    console.log(Window.SugarCubeState.passage);
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
                target[key] = value
                path.shift();
                // diffSet([...path, key], value);
                emitNewVars(target);
            }
            return true
        }
    }
}


/**
 * Takes in a pathArr after proxy on setting SugarCubeState is triggered. Will create a difference object with the diffKey
    as the key and it's new value after setting is done. 

    Sends the emits difference with the diff object as the payload to notify serverstore to update

 * @param {Array} pathArr: path followed by proxy to get to value being set
 * @param {*} value: the new value of whatever is being set
 * @returns 
 */
function diffSet(pathArr, value) {
    //find new value after setting is done

    //If an varible that has been labeled an exception is being set, stop
    if (exceptions.includes(pathArr[0])) {
        return;
    }
    let currKey;
    let prevKey = value
    while (pathArr.length > 0) {
        currKey = { [pathArr.pop()]: prevKey };
        prevKey = currKey;
    }

    console.log("diff:", currKey);
    socket.emit('difference', currKey)
    $(document).trigger(":liveupdate");

}

function emitNewVars(newState) {
    if (emitFlag) {
        console.log("new state: ", newState);
        socket.emit('difference', newState);
        $(document).trigger(":liveupdate");
    }
}

function initTheyr(lockInfo) {

    updateSugarCubeState(userData.gameState);

    socket = io();
    // Receive state from server upon connecting, then update all other clients that you've connected
    socket.on('connect', () => {
        socket.emit('new user', socket.id);
        console.log(lockInfo)
        lockInfo.callback(lockInfo.lockId)
    })

    socket.on('new connection', (state) => {
        // console.log("LOAD #2: RECEIEVE STATE");
        console.log("Connecting state:", state)
        for (let key of Object.keys(state)) {
            let val = state[key];
            let newVal;
            try {
                newVal = JSON.parse(val);
            } catch (e) {
                console.log("Couldn't parse", e);
                newVal = val;
            }
            state[key] = newVal;
        }
        // console.log("Current State:", Window.SugarCubeState.variables)
        let newState = Object.assign({}, Window.SugarCubeState.variables, state);
        updateSugarCubeState(newState);

        emitFlag = true;
        // console.log("Combined State", combinedState)
        // If the server's state is empty, set with this client's state
        //    updateSugarCubeState(combinedState);
        $(document).trigger(":liveupdate");
    });

    // Incoming difference, update your state and store
    socket.on('difference', (diff) => {
        console.log("got a difference");
        console.log("updating sugarcube", diff);
        updateSugarCubeState(diff)
        _.merge(buffer, diff)
        $(document).trigger(":liveupdate");
    })

    socket.on('reset', (diff) => {
        console.log("reseting sugarcube", diff);
        resetSugarCubeState(diff)

        $(document).trigger(":liveupdate");
    })
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