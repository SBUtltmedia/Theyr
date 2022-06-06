import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import webstack from '../Webstack.js';
import '../tweeGaze.js';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// ** DISCORD JS **
// const { Client, Intents } = require('discord.js');
// const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// const { REST } = require('@discordjs/rest');
// const { Routes } = require('discord-api-types/v9');

// const DISC_CLIENT_ID = '983373819030945812'
// const DISC_GUILD_ID = '968922771692339291'
// const TOKEN = "OTgzMzczODE5MDMwOTQ1ODEy.GEJeeD.38ICQXAaS49mWm3UPDNDcpmq67Wvt-gFDXr9ZE"

// const commands = [{
//   name: 'ping',
//   description: 'Replies with Pong!'
// }, {
//     name: 'pog',
//     description: 'Replies with Pog!'
// }]; 

// const rest = new REST({ version: '9' }).setToken(TOKEN);

// (async () => {
// 	try {
// 	  console.log('Started refreshing application (/) commands.');
  
// 	  await rest.put(
// 		Routes.applicationGuildCommands(DISC_CLIENT_ID, DISC_GUILD_ID),
// 		{ body: commands },
// 	  );
  
// 	  console.log('Successfully reloaded application (/) commands.');
// 	} catch (error) {
// 	  console.error(error);
// 	}
// })();
  
// client.once('ready', () => {
// 	console.log(`Logged in as ${client.user.tag}`)
// })

// client.on('interactionCreate', async interaction => {
//     if (!interaction.isCommand()) return;
  
//     if (interaction.commandName === 'ping') {
//       await interaction.reply('Pong!');
//     }

// });

// client.login(TOKEN);

// ** END OF DISCORD JS **

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let config_path = 'config.json'

// Check if directory exists b/c it won't be available on Heroku (will use ENV variables instead)
if (fs.existsSync(__dirname + "/" + config_path)) {
	const confObj = require('./' + config_path);
	var { clientId, clientSecret, guildId } = confObj.channelconf[0];	// Indexed at 0 b/c when running locally we'll just use the first element as our test
	var { twinePath, port } = confObj.serverconf;
}

// Gets environment variables from Heroku. Otherwise, get them locally from the config file.
const CLIENT_ID = process.env.clientId || clientId;
const CLIENT_SECRET = process.env.clientSecret || clientSecret;
const TWINE_PATH = process.env.twinePath || twinePath;
const PORT = process.env.PORT || port;
const HEROKU_URL = process.env.herokuURL || `http://localhost:${PORT}`;
const GUILD_ID = process.env.guildId || guildId;
const REDIRECTURL = process.env.redirectURL || `https://discord.com/api/oauth2/authorize?response_type=code"&"scope=identify"&"guilds.members.read"&"guilds"&"client_id=${CLIENT_ID}"&"redirect_uri=${encodeURIComponent(HEROKU_URL)}`;

const { app } = new webstack(PORT).get();
const htmlTemplate = './views/index.html'

// Listen for requests to the homepage
app.get('/', async ({ query }, response) => {
	// console.log({query});
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
		
		userDataJSON = JSON.stringify({"id":id,"nick":nickname, "faction": "Aztecs", "avatar":null,"discriminator":"2739","public_flags":0,"flags":0,"banner":null,"banner_color":null,
		"accent_color":null,"locale":"en-US","mfa_enabled":false});
		return returnTwine(userDataJSON, response);
	}

	// Redirects through Discord API
	if (code) {
		try {
			const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
				method: 'POST',
				body: new URLSearchParams({
					client_id: CLIENT_ID,
					client_secret: CLIENT_SECRET,
					code,
					grant_type: 'authorization_code',
					redirect_uri: HEROKU_URL,
					scope: 'identify',
				}),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			const oauthData = await oauthResult.json();
			if (oauthData.error) {
				return loadHome(response);
			}
			
			const userResult = await fetch('https://discord.com/api/users/@me', {
				headers: {
					authorization: `${oauthData.token_type} ${oauthData.access_token}`,
				},
			});
			
			const userResultJson = await userResult.json();
			let userData = JSON.stringify(userResultJson);
			
			const guildResult = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, {
				headers: {
					authorization: `${oauthData.token_type} ${oauthData.access_token}`,
				},
			});
			const guildResultJson = await guildResult.json();
			const userDataJSON = JSON.stringify({...guildResultJson, ...userResultJson});
			

			return returnTwine(userDataJSON, response);
			
		} catch (error) {
			// NOTE: An unauthorized token will not throw an error;
			// it will return a 401 Unauthorized response in the try block above
			console.error(error);
		}
	}
	loadHome(response);
});

function returnTwine(userData, response) {
	let userDataScriptTag =  `
	<script> let userData=${userData} </script>
	`
	let file = TWINE_PATH
	let fileContents = fs.readFileSync(file)
	return response.send(`${fileContents} ${userDataScriptTag}`);
}

function loadHome(response) {
	let htmlContents = fs.readFileSync(htmlTemplate, 'utf8')
	let indexHtml = htmlContents.replace("%redirectURL%", REDIRECTURL)

	response.send(indexHtml);
}

// Generates a random ID
function generateId() {
	let id = "";
	for (let i = 0; i < 18; i++) {
		id += Math.floor(Math.random() * 10);
	}
	return id;
}

