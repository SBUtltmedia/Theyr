import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import webstack from '../Webstack.js';
import '../tweeGaze.js';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bodyParser = require('body-parser');
const hex = require('string-hex')


//loads config vars from config.json if .env file doesn't exist
if (!process.env?.port) {
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	let config_path = '../config.json';

	if (fs.existsSync(__dirname + "/" + config_path)) {
		var { fileName, twinePath, port} = confObj.serverconf;
	}


}



const htmlTemplate = './loginDiscord/index.html'

// Destructure config.json variables (Check if directory exists b/c it won't be available on Heroku (will use ENV variables instead))

// Gets environment variables from Heroku. Otherwise, get them locally from the config file.
const TWINE_PATH = process.env.twinePath || twinePath;
const PORT = process.env.PORT || port;
const FILENAME = process.env.fileName || fileName;
const SERVERCONF = { "port": PORT, "twinePath": TWINE_PATH, "githubToken": GITHUBTOKEN, "githubUser": GITHUBUSER, "githubRepo": GITHUBREPO, "fileName": FILENAME, "appIndex": appID }

let refreshTokens = {};
const webstackInstance = new webstack(SERVERCONF);
const { app } = webstackInstance.get();

//for reading input from twee 
app.get('/dump', async ({ query }, res) => {
	res.send(webstackInstance.serverStore.getState());
})
// Listen for requests to the homepage
app.get('/', async ({ query }, response) => {
	const { code, state, test, nick } = query;

	if (code) {
		let payload = {
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			code,
			grant_type: 'authorization_code',
			redirect_uri: HEROKU_URL,
			scope: 'identify',
		};
		if (refreshTokens[state]) {
			payload = { ...payload, ...{ grant_type: 'refresh_token', refresh_token: refreshTokens[state].refresh_token } }
			delete payload.code
		}
		try {
			const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
				method: 'POST',
				body: new URLSearchParams(payload),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			const oauthData = await oauthResult.json();
			console.log(oauthData)
			if (oauthData.refresh_token) {
				refreshTokens[state] = oauthData;

			}

			if (oauthData.error) {
				console.log({ oauthData });
				return loadHome(response, test);
			}

			const userResult = await fetch('https://discord.com/api/users/@me', {
				headers: {
					authorization: `${oauthData.token_type} ${oauthData.access_token}`,
				},
			});

			const userResultJson = await userResult.json();
			const guildResult = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, {
				headers: {
					authorization: `${oauthData.token_type} ${oauthData.access_token}`,
				},
			});
			const guildResultJson = await guildResult.json();
;
			return returnTwine({ gameState: webstackInstance.serverStore.getState(), authData: { ...guildResultJson, ...userResultJson } }, response);

		} catch (error) {
			// NOTE: An unauthorized token will not throw an error;
			// it will return a 401 Unauthorized response in the try block above
			console.error(error);
		}
	}
	else {
		loadHome(response, test);
	}
});

/**
 * Loads the actual twine game
 * 
 * @param {*} userData: initial data loaded from github
 * @param {*} response 
 * @returns the twine game html
 */
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

	let userDataScriptTag = `
	<script>
	sessionStorage.clear(); 
	let userData=${JSON.stringify(userData)} </script>
	`
	let file = TWINE_PATH
	let fileContents = fs.readFileSync(file)
	return response.send(`${fileContents} ${userDataScriptTag}`);
}

/**
 * Loads the discord Auth page
 * 
 * @param {*} response 
 * @param {boolean} isTest: true if testing page is being used, 
 * @returns discord auth page or if isTest is true: the twine page
 */
function loadHome(response, isTest) {
	let htmlContents = fs.readFileSync(htmlTemplate, 'utf8')
	let indexHtml = htmlContents.replace("%redirectURL%", REDIRECTURL)


	if (isTest) {
		return returnTwine({ gameState: webstackInstance.serverStore.getState() }, response);
	}
	else {
		response.send(indexHtml);
	}

}

