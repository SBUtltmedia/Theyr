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

    afterEach(() => {
        for (let socket of sockets) {
            socket.disconnect();
        }
        sockets = [];
    });

    this.afterAll(() => {
        webStack.getHTTP().close(() => {
            console.log("Server closed");
            let redis = webStack.getRedis();
            redis.quit();
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

        it('ensure consistency for multiple concurrent clients', function (done) {
            let numClients = 500;
            let numMessages = 1;
            
            const socketPromises = [];
            let receivedMessages = [];
            let socketMsg = new Map();
            let msgSet = new Set();

            console.log("Connecting sockets");

            for (let i = 0; i < numClients; i++) {
                const socket = io.connect(SOCKET_URL);

                socketPromises.push(new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        console.log(`Timeout for connecting socket ${socket.id}: `, socketMsg.get(socket.id));
                        reject(new Error(`Timeout for socket ${socket.id}`))
                    }, 15000);
                    socket.on('connect', () => {
                        clearTimeout(timeout);
                        if (socket.id !== undefined) {
                            resolve(socket);
                        } else {
                            resolve(undefined);
                        }
                    });
                }));
            }


            Promise.all(socketPromises).then((inpSockets) => {
                let emitPromises = [];
                console.log("inp len: ", inpSockets.length);
                console.log("Emitting data");
                let i = 0;
                for (let socket of inpSockets) {
                    if (socket.id === undefined) {
                        console.log("UNDEFINED SOCKET");
                    } else {
                        sockets.push(socket);
                        socketMsg.set(socket.id, []);
                    }
                }
                console.log("Map size: ", socketMsg.size);
                console.log("Sockets size: ", sockets.length);

                numClients = socketMsg.size;

                // const mpToObj = Object.fromEntries(socketMsg);
                // fs.writeFileSync('firstmapData.json', JSON.stringify(mpToObj, null, 2));
                let startTime = new Date();

                for (let socket of sockets) {
                    emitPromises.push(new Promise((resolve) => {
                        let responses = 0;

                        socket.on('difference', (data) => {
                            responses++;

                            receivedMessages.push(data.chatlog);
                            msgSet.add(data.chatlog);

                            let msgs = socketMsg.get(socket.id);
                            // if (!msgs) {
                            //     msgs = [];  // Initialize if it's undefined
                            //     socketMsg.set(socket.id, msgs);  // Set it again to ensure the map is updated
                            // }
                            
                            if (msgs === undefined) {
                                console.log(socket.id, socketMsg.get(socket.id));
                            }
                            msgs.push(data.chatlog);
                            socketMsg.set(socket.id, msgs);

                            // console.log(`Responses: ${responses} (Expecting: ${numClients - 1})`);

                            if (responses === numMessages * (numClients - 1)) {
                                resolve();
                            }
                        });

                        for (let j = 0; j < numMessages; j++) {
                            socket.emit('newState', { chatlog: `${i}_${j}` });
                        }
                    }));
                    i++;
                }

                Promise.all(emitPromises).then(() => {
                    let endTime = new Date();
                    let timeDifference = endTime - startTime;

                    const mpToObj = Object.fromEntries(socketMsg);
                    fs.writeFileSync('mapData.json', JSON.stringify(mpToObj, null, 2));
                    console.log("Key len: ", socketMsg.size);
                    expect(receivedMessages).to.have.lengthOf(numMessages * numClients * (numClients - 1));
                    for (let key of socketMsg.keys()) {
                        let data = socketMsg.get(key);
                        expect(data).to.have.lengthOf(numMessages * (numClients - 1));
                    }
                    console.log(`${numClients} clients with ${numMessages * numClients * (numClients - 1)} messages served in: ${timeDifference} milliseconds`);
                    console.log(`${numMessages * numClients * (numClients - 1) * 1000 / timeDifference} messages processed in: 1 second`);                    
                    done();                 
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

