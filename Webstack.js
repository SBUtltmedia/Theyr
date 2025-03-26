import express from 'express';
import { createRequire } from "module";
import { fileURLToPath } from 'url';
import path from 'path';
import {Mutex} from 'async-mutex';

const require = createRequire(import.meta.url);
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const _ = require("lodash"); 
var base64 = require('js-base64');
const Redis = require('ioredis');

const redis = new Redis({
	host: process.env.REDIS_HOST || '127.0.0.1',
	port: process.env.REDIS_PORT || 6379
});

class Webstack {
	constructor(serverConf) {
		this.serverConf = serverConf
		this.port = serverConf.port
		//I'm not sure if this actually saves to GIT because we don't call the function.
		app.use("/static", express.static('./static/'));
		app.use("/Twine", express.static('./Twine/'));
		app.use("/audio", express.static('./static/audio'));

		this.socketClientMap = new Map();
		this.initIO();

		// set well_coincount

		this.writeMutex = new Mutex();
		this.state = {};
		this.state["well_coincount"] = 100000;

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        // Serve static files from 'login/' directory
        // app.use(express.static(path.join(__dirname, 'login')));

        // // Default route to serve index.html if exists
        // app.get('/', (req, res) => {
        //     res.sendFile(path.join(__dirname, 'login', 'index.html'));
        // });		

		http.listen(this.port, () => console.log(`App listening at http://localhost:${this.port}`))
		console.log("port exists")

	}

	get() {
		return {
			app
		}
	}

	getHTTP() {
		return http;
	}

	getRedis() {
		return redis;
	}
	
	initIO() {
		io.on("connect_error", (err) => {
			console.log(`connect_error due to ${err.message}`);
		  });
		io.on('connection', async (socket) => {
			// let gstate = this.serverStore.getState();
			// User connects 
			socket.on('new user', async (id) => {
				console.log("SERVER RECEIVES NEW USER:", id);
				this.socketClientMap.set(socket.id, id);
			});

			socket.on('disconnect', async () => {
				// console.log("User disconnected: ", socket.id);
			})			

			// When a client detects a variable being changed they send the difference signal which is
			// caught here and sent to other clients
			socket.on('newState', async (diff) => {
				const release = await this.writeMutex.acquire();
				try {
					// console.log("Start exec");
					let keys = Object.keys(diff); // is always gonna be 1 key
					let key = keys[0];
					if (key !== "userId" && key !== "nick") {
						let val = diff[key];
						if (typeof val === 'object' && val !== null) {
							val = JSON.stringify(val);
						}
						let returnObj = {};
						// let reutrnState = await this.redisAtomicWrite(`${key}`, val);
						this.state[`${key}`] = val;
						returnObj[key] = val;
						// console.log("onj: ", returnObj);
						socket.broadcast.emit('difference', returnObj);
						// console.log("Emit");
					} else if (key === "userId") {
						this.socketClientMap[socket.id] = diff[key];
					}
				} catch (err) {
					console.error("Error processing newState:", err);
				} finally {
					// console.log("Release");
					release();
				}
			});

			socket.on('fullReset', ()=>{
				console.log("reset start 2")
				// TODO: Flush redis db?
				// this.serverStore.dispatch({
				// 	type: 'REPLACE',
				// 	payload: {}
				// })
				app.post('/updateGit',(req, res) => {
					res.send({})
				})
				socket.emit('reset',{})
				socket.broadcast.emit('reset', {})
			})

		});
	}
}





export default Webstack;