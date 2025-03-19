import fs from 'fs'
import webstack from '../Webstack.js'
import '../tweeGaze.js'
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const configObj = require('../config.json');

const { port, twinePath } = configObj.serverconf;

// Gets environment variables from Heroku. Otherwise, get them locally from the config file.
const PORT = process.env.PORT || port
const TWINE_PATH = process.env.twinePath || twinePath;
const appID = process.env.appID || 1
const SERVERCONF = { "port": PORT, "twinePath": TWINE_PATH}
const webstackInstance = new webstack(SERVERCONF)
const { app } = webstackInstance.get();
const htmlTemplate = 'login/index.html';

// Listen for requests to the homepage
app.get('/', async ({ query }, response) => {
	//userData is info from discord
	const userData = query;

    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');

	if (userData.nick) {
		const gameState = await webstackInstance.redisGetState();
		console.log(gameState);
		for (let key of Object.keys(gameState)) {
            let val = gameState[key];
            let newVal;
            try {
                newVal = JSON.parse(val);
            } catch (e) {
                console.log("Couldn't parse val: ", val);
                newVal = val;
            }
            gameState[key] = newVal;
        }
		console.log("user data nick: ", gameState);
		return returnTwine({ gameState: gameState}, response);
	} else {
		let htmlContents = fs.readFileSync(htmlTemplate, 'utf8')
		console.log("html template");
		response.send(htmlContents);
	}
});

function returnTwine(userData, response) {
	//removes private vars
	if(userData.gameState.theyrPrivateVars){
		Object.keys(userData.gameState.theyrPrivateVars).forEach((id)=>{
			if(userData.authData && id != userData.authData.id){
				delete userData.gameState.theyrPrivateVars[id];
			}
		})
	}

	if(!userData.gameState.theyrPrivateVars){
		userData.gameState.theyrPrivateVars = {};
	}

	let userDataScript=`
		<script>let userData=${JSON.stringify(userData)}</script>
	`
	let file = TWINE_PATH
	let fileContents = fs.readFileSync(file)
	return response.send(`${fileContents} ${userDataScript}`);
}

export {app, webstackInstance};