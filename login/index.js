import fs from 'fs'
import path from 'path'
import webstack from '../Webstack.js'

// Only run the Twine file watcher in development
if (process.env.NODE_ENV !== 'production') {
    import('../tweeGaze.js').then(() => {
        console.log("[DEV] Twine file watcher (Gaze) active.");
    }).catch(err => {
        console.error("[DEV] Failed to load Twine watcher:", err);
    });
}

// Default configuration
const defaults = {
    port: 3000,
    story: 'default',
    appID: 1
};

// Try to load config.json if it exists, but don't fail if it's missing
let configObj = { serverconf: {} };
try {
    const configPath = path.resolve(process.cwd(), 'config.json');
    if (fs.existsSync(configPath)) {
        configObj = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (err) {
    console.warn("[CONFIG] Could not read config.json, using defaults.");
}

const PORT = process.env.PORT || configObj.serverconf?.port || defaults.port;
const STORY = process.env.STORY || configObj.serverconf?.story || defaults.story;
const STORY_PATH = `./Twine/${STORY}`;
const TWINE_PATH = process.env.TWINE_PATH || configObj.serverconf?.twinePath || `${STORY_PATH}/index.html`;
const appID = process.env.appID || configObj.serverconf?.appID || defaults.appID;

console.log(`[SERVER] Active story: ${STORY}`);

const serverConf = {
	port: PORT,
	appIndex: appID,
	twinePath: TWINE_PATH,
	storyPath: STORY_PATH,
	...configObj.serverconf
};

const webstackInstance = new webstack(serverConf);
const { app } = webstackInstance.get();
const htmlTemplate = 'login/index.html';

// Handle Mock Login and Story Delivery
app.get('/', async ({ query }, response) => {
	const userData = query;

	if (userData.nick) {
		// Mimic a full Discord OAuth data structure for easy transition later
		const authData = {
			id: userData.id || Date.now().toString(),
			username: userData.nick,
			roles: userData.role ? [userData.role] : ['player'],
			avatar: null,
			verified: true,
			email: `${userData.nick.toLowerCase()}@mock.theyr`,
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
	// Inject the userData into the global window scope for the Twine client to read
	let userDataScript=`
		<script>
		sessionStorage.clear();
		window.userData = ${JSON.stringify(userData)};
		console.log("[THEYR] User Data Loaded:", window.userData.authData.username);
		</script>
	</head>`;
	
	try {
		let fileContents = fs.readFileSync(TWINE_PATH, 'utf8');
		// Inject into the <head> instead of just appending to the end of the file
		let modifiedHtml = fileContents.replace('</head>', userDataScript);
		return response.send(modifiedHtml);
	} catch (err) {
		console.error("[ERROR] Failed to read Twine file:", TWINE_PATH);
		return response.status(500).send(`Failed to load story: ${TWINE_PATH}. Make sure you have compiled your Twee files.`);
	}
}