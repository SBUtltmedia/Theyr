var socket = io();
var store = {};  //Redux.createStore(reducer);
var stateReceived = false;



// User connects, asks server for game state
socket.on('connect', () => {
    socket.emit('new user', socket.id);
})

// Receive state from server upon connecting, then update all other clients that you've connected
socket.on('new connection', (state) => {
    console.log("LOAD #2: RECEIEVE STATE");
    console.log("Connecting state:", state)
    console.log("Current State:", Window.SugarCubeState.variables)
    let combinedState= _.merge(state,Window.SugarCubeState.variables)
    console.log(combinedState)
    store=combinedState;
    // If the server's state is empty, set with this client's state
    updateSugarCubeState(combinedState);
    $(document).trigger(":liveupdate");







});

// Incoming difference, update your state and store
socket.on('difference', (state) => {
    console.log("Difference received from the server",state)
    store = state
    updateSugarCubeState(state) 

    $(document).trigger(":liveupdate");
})


// function reducer(state, action){
    
//     // Checks for undefined to prevent feedback loop. Skips undefined check if connecting to the game (updates game as soon as client joins)
//     // if(state === undefined && action.connecting !== undefined) {
//     //     console.log("State is undefined")
//     //     return {...state, ...Window.SugarCubeState.variables}
//     // }
//     let currentStore =state;
//     let currentVars= Window.SugarCubeState.variables;
//     switch(action.type){
//         case 'UPDATESTORE':
       
//             console.log('Updating Store and Other Clients', action.payload)
//             console.log("Difference emitted",_.merge(currentStore,currentVars)) 
//             socket.emit('difference', _.merge(currentStore,currentVars))
           
//             return  _.cloneDeep(Window.SugarCubeState.variables)
//         case 'UPDATEGAME':
//             console.log('Updating Game', action.payload);
//             updateSugarCubeState(  _.merge(currentStore,currentVars));
          
//             return
//         default:
//             return state
//     }
// }

setInterval(update, 1000)    // Check for differences and send a socket event to the server with your current state if differences are found 

// If differences between SugarCube state and store detected, update your store and the other clients
function update() {
    var tempVars={...Window.SugarCubeState.variables}
    delete tempVars['userId'] 
    // console.log(tempVars)

    if(Object.keys(difference(tempVars, store)).length){
        let diff = difference(tempVars, store);
        console.log('diff detected', diff)
        store=_.merge( store,tempVars)
        console.log('diff detected', diff,store)
        updateSugarCubeState(store)
        socket.emit('difference',store)
        $(document).trigger(":liveupdate");

      //  store.dispatch({type: 'UPDATESTORE', payload: diff, self: true});
    }
}

// Finds the difference between 2 different objects (Used to compare SugarCube State and Store)
function difference(object, base) {
	function changes(object, base) {
		return _.transform(object, function(result, value, key) {
            try {
                if (!_.isEqual(value, base[key])) {
                    result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
                }
            }
            catch(err) {
                // console.log("Error in diff:", err);
            }
		});
	}
	return changes(object, base);
}

// Updates client's SugarCube State when state changes are received from the server
function updateSugarCubeState(new_state) {

    for (const [key, value] of Object.entries(new_state)) {
     
        Window.SugarCubeState.variables[key] = value
    }
}
