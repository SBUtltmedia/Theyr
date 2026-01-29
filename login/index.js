import fs from 'fs'
import webstack from '../Webstack.js'
import '../tweeGaze.js'
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const configObj = require('../config.json');

const { port, twinePath } = configObj.serverconf;

const PORT = process.env.PORT || port
const TWINE_PATH = process.env.twinePath || twinePath;
const appID = process.env.appID || 1

const serverConf = {
	port: PORT,
	appIndex: appID,
	...configObj.serverconf
};

const webstackInstance = new webstack(serverConf);
const { app } = webstackInstance.get();
const htmlTemplate = 'login/index.html';

// Handle Mock Login and Story Delivery
app.get('/', async ({ query }, response) => {
	const userData = query;

	if (userData.nick) {
		// Mimic a full Discord OAuth data structure
		const authData = {
			id: userData.id || Date.now().toString(),
			username: userData.nick,
			discriminator: (Math.floor(Math.random() * 9000) + 1000).toString(),
			avatar: null, // No avatar in mock
			verified: true,
			email: `${userData.nick.toLowerCase()}@mock.theyr`,
			flags: 0,
			banner: null,
			accent_color: null,
			premium_type: 0,
			public_flags: 0,
			roles: userData.mock_role ? [userData.mock_role] : ['player'],
			nick: userData.nick // Guild-specific nickname
		};
		
		const gameState = webstackInstance.serverStore.getState();

		console.log(`[AUTH] Mock login successful for: ${authData.username} (${authData.roles[0]})`);
		return returnTwine({ gameState, authData }, response);
	}

	else {
		let htmlContents = fs.readFileSync(htmlTemplate, 'utf8')
		response.send(htmlContents);
	}
});

/**
 * Embeds user data and game state into the Twine story and serves it.
 */
function returnTwine(userData, response) {
	// Handle private variables (visible only to the owner)
	if(userData.gameState && userData.gameState.theyrPrivateVars){
		Object.keys(userData.gameState.theyrPrivateVars).forEach((id)=>{
			if(userData.authData && id != userData.authData.id){
				delete userData.gameState.theyrPrivateVars[id];
			}
		})
	}

	if(userData.gameState && !userData.gameState.theyrPrivateVars){
		userData.gameState.theyrPrivateVars = {};
	}

	// Inject the userData into the global window scope for the Twine client to read
	let userDataScript=`
		<script>
		sessionStorage.clear();
		window.userData = ${JSON.stringify(userData)};
		console.log("[THEYR] User Data Loaded:", window.userData.authData.username);
		</script>
	`
	
	try {
		let fileContents = fs.readFileSync(TWINE_PATH, 'utf8');
		// Append the script before the closing body tag or at the end
		return response.send(`${fileContents} ${userDataScript}`);
	} catch (err) {
		console.error("[ERROR] Failed to read Twine file:", TWINE_PATH);
		return response.status(500).send(`Failed to load story: ${TWINE_PATH}. Make sure you have compiled your Twee files.`);
	}
}