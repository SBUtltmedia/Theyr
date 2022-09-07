import fs from 'fs'
import webstack from '../Webstack.js'
import '../tweeGaze.js'
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const configObj = require('./config.json');

const { port, twinePath } = configObj.serverconf;

// Gets environment variables from Heroku. Otherwise, get them locally from the config file.
const PORT = process.env.PORT || port
const TWINE_PATH = process.env.twinePath || twinePath;

const { app } = new webstack(PORT).get();
const htmlTemplate = 'login/index.html';

// Listen for requests to the homepage
app.get('/', async ({ query }, response) => {
	const userData = query;

	const { code, state, test, nick } = query;
	let userDataJSON;

	// If using http://localhost:53134/?test=true use userDataJSON from this file
	if (test) {
		let nickname = "Cuauhtémoc"
		let id = "229035280496197642"
		if (nick) {
			nickname = nick
			id = generateId()
		}	
	}
	if (userData.nick) {
		return returnTwine(userData, response);
	}

	else {
		let htmlContents = fs.readFileSync(htmlTemplate, 'utf8')

		response.send(htmlContents);
	}
});

function returnTwine(userData, response) {
	let userDataScript=`
		<script>let userData=${JSON.stringify(userData)}</script>
	`
	let file = TWINE_PATH
	let fileContents = fs.readFileSync(file)
	return response.send(`${fileContents} ${userDataScript}`);
}