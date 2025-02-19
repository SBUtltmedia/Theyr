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
		redis.call('SET', '${key}', '${JSON.stringify(value)}')
		return redis.call('GET', '${key}')
		`;
		const newCount = await redis.eval(script, 0);
		return newCount;
	}
	
	initIO() {
		io.on("connect_error", (err) => {
			console.log(`connect_error due to ${err.message}`);
		  });
		io.on('connection', (socket) => {
			let gstate = this.serverStore.getState();
			// User connects 
			socket.once('new user', (id) => {
				console.log("SERVER RECEIVES NEW USER:", id);
			
				if (typeof gstate !== 'undefined') {
					//console.log("gstate", JSON.stringify(gstate))
					io.to(id).emit('new connection', gstate)
				} else {
					//console.log("Retrieving state from JSONFS", database.getData())
					io.to(id).emit('new connection', {})
				}
			})

			// When a client detects a variable being changed they send the difference signal which is
			// caught here and sent to other clients
			socket.on('difference', async (diff) => {
				this.serverStore.dispatch({
					type: 'UPDATE',
					payload: diff
				})
				console.log("Log diff: ", diff)
				this.redisAtomicWrite("diff", diff);
				//sends message to all other clients unless inside theyrPrivateVars
				if(!Object.keys(diff).includes("theyrPrivateVars")) {
					// redis.get('diff', (err, data) => {
					// 	if (data) {
					// 		socket.broadcast.emit('difference', JSON.parse(data));
					// 	}
					// })
					socket.broadcast.emit('difference', diff)
				}
			})


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