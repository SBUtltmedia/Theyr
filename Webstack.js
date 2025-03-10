import express from 'express';
import Redux from 'redux'
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const _ = require("lodash"); 
var base64 = require('js-base64');
const Redis = require('ioredis');

const redis = new Redis({
	host: '127.0.0.1',
	port: 6379
});

const INTERVAL_MS = 75;

// io.on('connect', (socket) => {
// 	console.log("A client connected: ", socket.id);

// 	socket.on
// })

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

		http.listen(this.port, () => console.log(`App listening at http://localhost:${this.port}`)
		
		)
		console.log("port exists")

	}

	get() {
		return {
			app
		}
	}

	async redisAtomicWrite(key, value) {
		const script = `
			redis.call('SET', KEYS[1], ARGV[1])
			redis.call('SADD', 'theyr', KEYS[1])
			return redis.call('GET', KEYS[1])
		`;
		return await redis.eval(script, 1, key, value);
	}

	async redisAtomicGetKeys() {
		const script = `
		return redis.call('SMEMBERS', 'theyr')
		`
		const keys = await redis.eval(script, 0);
		return keys;
	}

	async redisGetState() {
		let keys = await this.redisAtomicGetKeys();
		const state = {};
		for (let key of keys) {
			state[key] = await redis.get(key);
		}
		console.log("State: ", state);
		return state;		
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
				let userID = this.socketClientMap.get(socket.id);
				if (userID !== null && userID !== undefined && this.socketClientMap.has(userID)) {
					this.socketClientMap.delete(socket.id);
					let users = await redis.get("users");
					if (users !== null && users !== undefined) {
						users = JSON.parse(users);
						delete users[userID];
						await this.redisAtomicWrite("users", JSON.stringify(users));
					}
				}
				console.log("User disconnected: ", userID);
			})			

			// When a client detects a variable being changed they send the difference signal which is
			// caught here and sent to other clients
			socket.on('newState', async (diff) => {
				let keys = Object.keys(diff); // is always gonna be 1 key
				let key = keys[0];
				if (key !== "userId" && key !== "nick") {
					let val = diff[key];
					if (typeof val === 'object' && val !== null) {
						val = JSON.stringify(val);
					}
					let reutrnState = await this.redisAtomicWrite(`${key}`, val);
					let returnObj = {};
					returnObj[key] = reutrnState;
					socket.broadcast.emit('difference', returnObj);
				} else if (key === "userId") {
					this.socketClientMap[socket.id] = diff[key];
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