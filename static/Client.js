var socket;
var exceptions = []
var stateReceived = false;
let lockInfo = {};
var gameVars;
var lastStats = [];
var buffer = [];

function init() {
    // $('#passages').html($('#passages').html().replace(/<br><br>/gm, ""));

    console.log(Window.SugarCubeState.passage);
    $("body").addClass("blur")
    $("body").one("click", () => {
        $("body").removeClass("blur")
    });
    // setInterval(checkDif, 1000)
}



/**
 * Loads twine background based on the player's faction
 */
function setBackground() {
    let { faction } = getUser();
    let imageURL = `url('Twine/images/Borders/Observer.jpg')`
    if (faction) {
        imageURL = `url('Twine/images/Borders/${faction}.jpg')`
    }
    
    $(() => {
        $('#story').css({
            'background-image': imageURL,
            'background-position': '30% 70%,0 0',
            'background-size': '100% 100%'
        })
    })
}

/**
 * Fade in effect
 * 
 * @param {*} el 
 * @param {*} destination 
 */
function fade(el, destination) {
    $({
        opacity: 1 - destination
    })
        .animate({
            opacity: destination
        }, {
            duration: 2000,
            step: function () {
                $(el).css({
                    opacity: this.opacity
                })
            }
        });
}


$(document).on(':passagestart', (ev) => {
    init()
    //fade($("#passages"), 1);
})

$(document).ready(() => {
    console.log("readey")
    //fade($("#passages"), 1);
})


/* JavaScript code */

function showMap() {
    var map = $('#map')
    if (!map.length) {
        $('#story').append($('<img/>', {
            "id": "map",
            "name": "map"
        }))
    }

    let user = Window.SugarCubeState.variables['users'][Window.SugarCubeState.variables.role]
    let role = user.role
    let faction =  user.faction
    var currentMapIndex =  parseInt(user.currentMap)
    let currentMap

    if (!currentMapIndex) {
        let currentMapIndex = Window.SugarCubeState.getVar(`$${faction}_currentMap`) || 0;
        currentMap = `${faction}_${currentMapIndex}.png`
    } else {
        currentMap = `${role}_${currentMapIndex}.png`
    }

    let map_src = $('#map').attr("src")

    if (map_src != currentMap) {
        $('#map').attr("src", `Twine/images/maps/${currentMap}`)
    }
}

/**
 * Displays player's stats widget
 */
function showStats() {
    var stats = {
        "Strength": 0,
        "Wisdom": 0,
        "Loyalty": 0
    }

    var displayStats = $('<div/>', {
        "id": "displayStats",
    })
    let user = Window.SugarCubeState.variables['users'][Window.SugarCubeState.variables.role];
    let twineStats =  user.stats;
    let faction = user["faction"];

    if (twineStats) {
        Object.keys(stats).forEach((stat, idx) => {
            var twineVar = twineStats[stat]

            displayStats.append(
                $('<div/>', {
                    "class": "stat",
                    "css": { "background-image": `url(Twine/images/Stats/${faction}_${stat}.png)` }
                }).append($('<div/>', {
                    "class": "statNum",
                    "html": twineVar || "0"
                })))
        })

        var dispLayStatsDOM = $('#displayStats')

        if (!dispLayStatsDOM.length) {
            $('#story').append(displayStats)
        }
        else {
            dispLayStatsDOM.replaceWith(displayStats)
        }
    }

    let factions =  Window.SugarCubeState.variables['factions']
    let twineVar = factions[faction]['stats']['Strength'];

    if (twineVar != null) {
        let statString = `${faction}: ${twineVar} `;
        if (!$('#factionStrength').length) {

            $('#story')
                .append($('<div/>',
                    {
                        "id": "factionStrength",
                    })
                    .append(
                        $('<div/>', {
                            "id": "factionStrengthBar",
                            // "html": statString
                        }))
                ).append($('<div/>', {
                    "id": "factionStrengthLabel",
                    // "html": statString
                }))
        }
        $("#factionStrengthLabel").html(statString);
        setFactionStrength(twineVar)  // set back to twineVar
    }

}


function setFactionStrength(rawValue) {
    var maxValue = 14;
    var value = rawValue / maxValue * 100;
    //console.log({value, rawValue});


    let gradientMask = `linear-gradient(90deg, black 0%, black ${Math.floor(value)}%, transparent ${Math.min(100, value + 10)}%)`;
    let maskStyle = `-webkit-mask-image:${gradientMask};mask-image:${gradientMask};`;
    // console.log(maskStyle)
    $("#factionStrengthBar").attr("style", maskStyle)

}

/**
 * Creates stat picker widget when player gets to pick their stats
 * 
 * @param {object} statsIn: a player's default stats
 */
function makeRoleStats(statsIn) {
    let role = Window.SugarCubeState.variables.role;
    let user = Window.SugarCubeState.variables.users[role]
    var output = "";

    user["stats"] = statsIn;

    //TODO: try to only send stats of user
      socket.emit('difference',  Window.SugarCubeState.variables)
    Object.keys(statsIn).forEach((stat) => {
        val = parseInt(statsIn[stat]);
        // SugarCube.State.variables[`${role}_${stat}`] = val;
        output += `${stat}: ${val}\n`;
    }
    )
    $('#statsPicker').html(output)
  
    showStats()
}


function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

/**
 * A function to modify a role's stats
 * 
 * @param {string} rolePlay: the role whose stats are being modified
 * @param {object} newStats: the new stat values
 */
function changeStats(rolePlay, newStats) {
    let usersObj= Window.SugarCubeState.variables.users;
    let currentUserId = Window.SugarCubeState.variables.role
    if(currentUserId == undefined){
        currentUserId = "NotSeen"
    }
    console.log("user:" , currentUserId)
    let currentUser =usersObj[currentUserId]
    let roleStats = currentUser.stats
    console.log("stats:", roleStats)
    Object.keys(roleStats).forEach((stat, idx) => {
        console.log("stat:", stat);
        console.log( roleStats[stat])
        roleStats[stat] = parseInt(newStats[stat]) + parseInt(roleStats[stat])
        console.log(newStats[stat])
    });
    Window.SugarCubeState.variables.users[currentUserId]["stats"] =roleStats;

    //renaming rolestats to stats so a diff object can be created
    let stats = roleStats
    let diff = {users: {[currentUserId] :  {stats}}};
    console.log("stat change diff:", diff);
    
    socket.emit('difference', diff);
}

function fullReset(){
    console.log("reset start")
    socket.emit('fullReset', '');
}

function DOMTest(){
    setTimeout({})
   return $("#passages").children()[0].innerHTML
}








// Returns the role of the current player
function getUser() {
    let userId = Window.SugarCubeState.getVar("$role");
    let user =  Window.SugarCubeState.getVar("$users")[userId];
    return user;
}


//Creates a handler for the state proxy, maintains entire path of var getting set for emitting to webstack
function createHandler(path = []){
    return {
    get(target, key) {
        if(path.length == 0 && key != `variables`){
            return target[key];
        }
        if (typeof target[key] === 'object' && Array.isArray(target[key]) ==false &&  target[key] !== null) {
        return new Proxy(target[key], createHandler([...path,key]))
        } else {
        return target[key];
        }
    },
    set (target, key, value) {
        if(target[key] != value){
            target[key] = value
            path.shift();
            diffSet([...path,key], value)
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
function diffSet(pathArr, value){
    //find new value after setting is done
    
    //If an varible that has been labeled an exception is being set, stop
    if(exceptions.includes(pathArr[0])){
        return;
    }
    let currKey;
    let prevKey = value
    while(pathArr.length > 0){
        currKey = {[pathArr.pop()]: prevKey};
        prevKey = currKey;
    }

    console.log("diff:", currKey);
    socket.emit('difference',  currKey)
    $(document).trigger(":liveupdate");

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
        // console.log("Current State:", Window.SugarCubeState.variables)
        let combinedState = Object.assign({}, Window.SugarCubeState.variables,state)
        // console.log("Combined State", combinedState)
        // If the server's state is empty, set with this client's state
    //    updateSugarCubeState(combinedState);
        $(document).trigger(":liveupdate");
    });

    // Incoming difference, update your state and store
    socket.on('difference', (diff) => {
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
       _.merge(Window.SugarCubeState.variables, new_state);
    
        $(document).trigger(":liveupdate");
    }

    // Updates client's SugarCube State when state changes are received from the server
    function resetSugarCubeState(new_state) {
        for (var member in Window.SugarCubeState.variables) delete Window.SugarCubeState.variables[member];
        Window.SugarCubeState.variables =  new_state
        console.log(new_state, Window.SugarCubeState.variables)
         $(document).trigger(":liveupdate");
     }

//Exceptions are global variables that shouldn't be shared between users
function addTheyrException(varName){
    varName = varName.replace('State.variables.','')
    console.log(varName)
    exceptions.push(varName);
}