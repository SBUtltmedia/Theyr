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

	if (userData.nick) {
		return returnTwine({ gameState: webstackInstance.serverStore.getState()}, response);
	}

	else {
		let htmlContents = fs.readFileSync(htmlTemplate, 'utf8')

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