import express from 'express';
import Redux from 'redux'
import fs from 'fs';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const _ = require("lodash"); 
const initVars = require("./leanVars.json");

// Allow persistence path to be overridden by environment variable (e.g., for Render Disks)
const STATE_FILE = process.env.STATE_FILE_PATH || './gameState.json';

class Webstack {
	constructor(serverConf) {
		this.appIndex = serverConf.appIndex
		this.serverConf = serverConf
		this.port = serverConf.port;

		// Serve story-specific assets at root (for relative paths in CSS/JS)
		if (serverConf.storyPath) {
			app.use("/", express.static(serverConf.storyPath, { index: false }));
			console.log(`[SERVER] Serving story assets from: ${serverConf.storyPath}`);
		}

		app.use("/static", express.static('./static/'));
		app.use("/Twine", express.static('./Twine/'));
		app.use("/audio", express.static('./static/audio'));

		// serverStore stores the current game state
		this.serverStore = Redux.createStore(this.reducer);
		this.initIO();

		// Load initial state from local file or fallback to leanVars
		this.loadState();

		// DM Mode: Watch for manual edits to the state file
		this.watchStateFile();

		http.listen(this.port, () => console.log(`App listening at http://localhost:${this.port}`));

		process
			.on('SIGTERM', this.shutdown('SIGTERM'))
			.on('SIGINT', this.shutdown('SIGINT'))
			.on('uncaughtException', this.shutdown('uncaughtException'));
	}

	loadState() {
		try {
			if (fs.existsSync(STATE_FILE)) {
				console.log(`[SERVER] Loading persistent state from ${STATE_FILE}`);
				const data = fs.readFileSync(STATE_FILE, 'utf8');
				const state = JSON.parse(data);
				this.serverStore.dispatch({
					type: 'REPLACE',
					payload: state
				});
			} else {
				console.log(`[SERVER] No persistent state found, using ${initVars ? 'leanVars.json' : 'empty state'}`);
				this.serverStore.dispatch({
					type: 'REPLACE',
					payload: initVars || {}
				});
			}
		} catch (err) {
			console.error("[SERVER] Error loading state:", err.message);
			this.serverStore.dispatch({ type: 'REPLACE', payload: initVars || {} });
		}
	}

	saveState() {
		try {
			const state = this.serverStore.getState();
			console.log(`[SERVER] Saving state to ${STATE_FILE}...`);
			// Temporarily ignore the watcher to avoid an infinite loop
			this.isSaving = true;
			fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 4));
			console.log("[SERVER] State saved successfully.");
			setTimeout(() => { this.isSaving = false; }, 100);
		} catch (err) {
			console.error("[SERVER] Error saving state:", err.message);
			this.isSaving = false;
		}
	}

	watchStateFile() {
		if (!fs.existsSync(STATE_FILE)) return;
		
		console.log(`[DM-MODE] Watching ${STATE_FILE} for live edits...`);
		fs.watch(STATE_FILE, (eventType) => {
			if (eventType === 'change' && !this.isSaving) {
				// Use a small debounce to allow the file write to finish
				if (this.watchTimeout) clearTimeout(this.watchTimeout);
				this.watchTimeout = setTimeout(() => {
					console.log(`[DM-MODE] Manual edit detected in ${STATE_FILE}. Syncing with players...`);
					this.loadState();
					// Broadcast the fresh state to everyone
					io.emit('new connection', this.serverStore.getState());
				}, 100);
			}
		});
	}

	get() {
		return {
			app
		}
	}

	shutdown(signal) {
		return (err) => {
			console.log(`[SERVER] Shutting down (${signal})...`);
			if (err && signal === 'uncaughtException') {
				console.error(err);
			}
			this.saveState();
			process.exit(err ? 1 : 0);
		}
	}

	// Controller for serverStore
	reducer(state, action) {
		switch (action.type) {
			case 'UPDATE':
				return _.merge({}, state, action.payload);
			case 'REPLACE':
				return action.payload;
			default:
				return state
		}
	}
	
	initIO() {
		io.on("connect_error", (err) => {
			console.log(`connect_error due to ${err.message}`);
		  });
		io.on('connection', (socket) => {
			// User connects 
			socket.once('new user', (id) => {
				console.log("SERVER RECEIVES NEW USER:", id);
				let gstate = this.serverStore.getState();
				socket.emit('new connection', gstate || {})
			})

			// Handle stateUpdate from th-set macro
			socket.on('stateUpdate', (data) => {
				const varName = data.variable.startsWith('$') ? data.variable.substring(1) : data.variable;
				const diff = {};
				_.set(diff, varName, data.value);

				this.serverStore.dispatch({
					type: 'UPDATE',
					payload: diff
				})

				socket.emit('difference', diff);
				socket.broadcast.emit('difference', diff);
			})

			// Handle Atomic Updates
			socket.on('atomicUpdate', (data) => {
				const varName = data.variable.startsWith('$') ? data.variable.substring(1) : data.variable;
				let currentState = this.serverStore.getState();
				let currentValue = _.get(currentState, varName);

				if (currentValue === undefined || currentValue === null) currentValue = 0;
				
				currentValue = Number(currentValue);
				let operand = Number(data.value);
				let newValue = currentValue;

				switch(data.operation) {
					case 'add': newValue += operand; break;
					case 'subtract': newValue -= operand; break;
					case 'multiply': newValue *= operand; break;
					case 'divide': newValue /= operand; break;
					case 'modulus': newValue %= operand; break;
					case 'set': newValue = data.value; break;
					default: return;
				}

				const diff = {};
				_.set(diff, varName, newValue);

				this.serverStore.dispatch({
					type: 'UPDATE',
					payload: diff
				})

				socket.emit('difference', diff);
				socket.broadcast.emit('difference', diff);
			});

			socket.on('fullReset', ()=>{
				this.serverStore.dispatch({
					type: 'REPLACE',
					payload: Object.assign({}, initVars)
				})
				socket.emit('reset',{})
				socket.broadcast.emit('reset', {})
			})

		});
	}
}

export default Webstack;