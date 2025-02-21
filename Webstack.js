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

		//serverStore stores the current game state and is backed up via gitApiIO because Heroku is ephemeral 
		this.serverStore = Redux.createStore(this.reducer);
		this.serverStore.dispatch({
			type: 'UPDATE',
			payload: {}
		})
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

	  
	//Controller for serverStore
	reducer(state, action) {
		// console.log({state})
		// console.log(JSON.stringify({action}));
		switch (action.type) {
			case 'UPDATE':
				let temp = _.merge(state, action.payload);
				// console.log("temp:", JSON.stringify(temp.users))
				return temp;
			case 'REPLACE':
				return action.payload;
			default:
				return state
		}
	}

	async redisAtomicWrite(key, value) {
		const script = `
		redis.call('SET', '${key}', '${value}')
		redis.call('SADD', 'theyr', '${key}')
		return redis.call('GET', '${key}')
		`;
		const newCount = await redis.eval(script, 0);
		return newCount;
	}

	async redisAtomicGetKeys() {
		const script = `
		return redis.call('SMEMBERS', 'theyr')
		`
		const keys = await redis.eval(script, 0);
		return keys;
	}
	
	initIO() {
		io.on("connect_error", (err) => {
			console.log(`connect_error due to ${err.message}`);
		  });
		io.on('connection', async (socket) => {
			console.log("New connection!!!: ", socket.id);
			// let gstate = this.serverStore.getState();
			// User connects 
			socket.on('new user', async (id) => {
				console.log("SERVER RECEIVES NEW USER:", id);

				this.socketClientMap.set(socket.id, id);
				const keys = await this.redisAtomicGetKeys();
				const state = {};
				for (let key of keys) {
					state[key] = await redis.get(key);
				}
				console.log("connecting state: ", state);
				if (typeof state !== 'undefined') {
					//console.log("gstate", JSON.stringify(gstate))
					io.to(id).emit('new connection', state)
				} else {
					//console.log("Retrieving state from JSONFS", database.getData())
					io.to(id).emit('new connection', {})
				}
			});

			socket.on('disconnect', async () => {
				let userID = this.socketClientMap.get(socket.id);
				if (userID !== undefined) {
					this.socketClientMap.delete(socket.id);
					let users = await redis.get("users");
					if (users !== null || users !== undefined) {
						users = JSON.parse(users);
						delete users[userID];
						await this.redisAtomicWrite("users", JSON.stringify(users));
					}
				}
				console.log("User disconnected: ", userID);
			})			

			// When a client detects a variable being changed they send the difference signal which is
			// caught here and sent to other clients
			socket.on('difference', async (diff) => {
				// console.log("diff: ", diff);
				for (let key of Object.keys(diff)) {
					if (key !== "userId" && key !== "nick") {
						let val = diff[key];
						if (typeof val === 'object' && val !== null) {
							val = JSON.stringify(val);
						}
						await this.redisAtomicWrite(`${key}`, val);
					}
				}
				let returnDiff = {};
				const keys = await this.redisAtomicGetKeys();
				for (let key of keys) {
					console.log("Key: ", key);
					if (key !== "userId" && key !== "theyrPrivateVars") {
						let val = await redis.get(`${key}`);
						if (val !== null) {
							// console.log("val: ", val);
							let newVal;
							try {
								newVal = JSON.parse(val);
							} catch (e) {
								// console.log("Could not convert val", e);
								newVal = val
							}
							// console.log("Getting data: ", newVal);
							returnDiff[key] = newVal;
							console.log(returnDiff[key]);
						}
					}
				}
				// console.log("Return diff: ", returnDiff);
				if (Object.keys(returnDiff).length > 0) {
					// console.log("Sending in diff: ", returnDiff);
					socket.broadcast.emit('difference', returnDiff);
				}
			});

			socket.on('fullReset', ()=>{
				console.log("reset start 2")
				this.serverStore.dispatch({
					type: 'REPLACE',
					payload: {}
				})
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