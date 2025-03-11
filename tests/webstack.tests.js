// test/webstack.test.js
import { expect } from 'chai';
import supertest from 'supertest';
import io from 'socket.io-client';
import Webstack from '../Webstack.js'; // Adjust the path
import http from 'http';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import confObj from '../config.json' with {type: 'json'};

const require = createRequire(import.meta.url);

if (!process.env?.port) {
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	let config_path = '../config.json';

	if (fs.existsSync(__dirname + "/" + config_path)) {
		var { fileName, twinePath, port} = confObj.serverconf;
	}
}

const TWINE_PATH = process.env.twinePath || twinePath;
const PORT = process.env.PORT || port;
const FILENAME = process.env.fileName || fileName;
const SERVERCONF = { "port": PORT, "twinePath": TWINE_PATH, "fileName": FILENAME}

const webStack =  new Webstack(SERVERCONF);
const app = webStack.get().app;

describe('Webstack Server Tests', function () {
    let sockets = [];
    const SOCKET_URL = `http://localhost:${PORT}`;
    const NUM_CLIENTS = 50;

    afterEach(() => {
        for (let socket of sockets) {
            socket.disconnect();
        }
    });

    this.afterAll(() => {
        webStack.getHTTP().close(() => {
            console.log("Server closed");
        });
    })

    describe('WebSocket Concurrency Tests', function () {
        it('should allow multiple clients to emit and receive messages simultaneously', function (done) {
            const messages = [];
            let socket1 = io.connect(SOCKET_URL);
            let socket2 = io.connect(SOCKET_URL);
            let socket3 = io.connect(SOCKET_URL);

            sockets.push(socket1);
            sockets.push(socket2);
            sockets.push(socket3);

            socket1.emit('newState', { chatlog: 'Message from user1' });
            socket2.emit('newState', { chatlog: 'Message from user2' });
            socket3.emit('newState', { chatlog: 'Message from user3' });

            socket1.on('difference', (data) => {
                messages.push(data.chatlog);
            });
            socket2.on('difference', (data) => {
                messages.push(data.chatlog);
            });
            socket3.on('difference', (data) => {
                messages.push(data.chatlog);
            });

            // Wait for all messages to be received and verify order
            setTimeout(() => {
                expect(messages).to.have.members([
                    'Message from user1',
                    'Message from user1',
                    'Message from user2',
                    'Message from user2',
                    'Message from user3',
                    'Message from user3'
                ]);
                done();
            }, 1000);
        });

        it('should handle many concurrent socket emits and updates correctly', function (done) {
            const messages = [];
            let msgSet = new Set();
            for (let i = 0; i < NUM_CLIENTS; i++) {
                const socket = io.connect(SOCKET_URL);
                socket.on('connect', () => {
                    socket.emit('newState', { chatlog: `Message ${i}` });
                });
                socket.on('difference', (data) => {
                    messages.push(data.chatlog);
                    msgSet.add(data.chatlog);
                });
                sockets.push(socket);
            }

            setTimeout(() => {
                // Assert that all messages have been received
                // emitting one newState leads on to NUM_CLIENTS - 1 messages
                expect(messages).to.have.lengthOf(NUM_CLIENTS * (NUM_CLIENTS - 1));
                expect(msgSet).to.have.lengthOf(50);
                done();
            }, 2000);
        });

        it('should ensure proper message ordering for multiple concurrent clients', function (done) {
            const numClients = 1000;
            
            const socketPromises = [];
            let receivedMessages = [];
            let socketMsg = new Map();
            let msgSet = new Set();

            for (let i = 0; i < numClients; i++) {
                const socket = io.connect(SOCKET_URL);
                sockets.push(socket);
                socketPromises.push(new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        console.log(`Timeout for connecting socket ${socket.id}: `, socketMsg.get(socket.id));
                        reject(new Error(`Timeout for socket ${socket.id}`))
                    }, 15000);
                    socket.on('connect', () => {
                        clearTimeout(timeout);
                        // socket.emit('newState', { chatlog: `${i}` });
                        socketMsg.set(socket.id, []);
                        resolve(socket);
                    });
                }));
            }

            Promise.all(socketPromises).then((connectedSockets) => {
                let emitPromises = [];
                for (let i = 0; i < numClients; i++) {
                    connectedSockets[i].on('difference', (data) => {
                        receivedMessages.push(data.chatlog);
                        msgSet.add(data.chatlog);
                        let msgs = socketMsg.get(connectedSockets[i].id);
                        msgs.push(data.chatlog);
                        socketMsg.set(connectedSockets[i].id, msgs);
                    });
                }

                for (let i = 0; i < numClients; i++) {
                    emitPromises.push(new Promise((resolve) => {
                        connectedSockets[i].emit('newState', { chatlog: `${i}` });
                        resolve();
                    }));                    
                }

                Promise.all(emitPromises).then(() => {
                    setTimeout(() => {
                        // console.log(socketMsg);
                        expect(receivedMessages).to.have.lengthOf(numClients * (numClients - 1));
                        for (let key of socketMsg.keys()) {
                            let data = socketMsg.get(key);
                            let sortedData = data.sort((a, b) => a - b);
                            expect(data).to.have.deep.equals(sortedData);
                        }
                        done();
                    }, 20000);                    
                }).catch((err) => {
                    console.error("Promise.all failed with error:", err);
                    console.log(msgSet, msgSet.size);
                    done(err);
                });
            }).catch((err) => {
                console.error("Promise.all failed with error:", err);
                console.log(msgSet, msgSet.size);
                done(err);
            });
        });
    });
});

