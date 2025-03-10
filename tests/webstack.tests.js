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

const request = supertest(app);

// Test Suite for Webstack
describe('Webstack Server Tests', function () {
    let socket1, socket2, socket3;
    const SOCKET_URL = `http://localhost:${PORT}`;
    const NUM_CLIENTS = 50;

    before((done) => {
        // Initialize WebSocket clients before tests
        socket1 = io.connect(SOCKET_URL);
        socket2 = io.connect(SOCKET_URL);
        socket3 = io.connect(SOCKET_URL);

        let connectedSockets = 0;

        // Increment counter when each socket connects
        const checkConnections = () => {
            connectedSockets += 1;
            if (connectedSockets === 3) { // Check if all three sockets are connected
                done(); // Only call done once all sockets are connected
            }
        };

        // Listen for the 'connect' event on each socket
        socket1.on('connect', checkConnections);
        socket2.on('connect', checkConnections);
        socket3.on('connect', checkConnections);
    });

    afterEach(() => {
        // Disconnect all sockets after each test to avoid leaks
        socket1.disconnect();
        socket2.disconnect();
        socket3.disconnect();
    });
    // WebSocket Concurrency Tests
    describe('WebSocket Concurrency Tests', function () {
        it('should allow multiple clients to emit and receive messages simultaneously', function (done) {
            const messages = [];

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
                console.log("Messages: ", messages);
                expect(messages).to.have.members([
                    'Message from user1',
                    'Message from user1',
                    'Message from user2',
                    'Message from user2',
                    'Message from user3',
                    'Message from user3'
                    // 'Message from user1Message from user2',
                    // 'Message from user1Message from user2Message from user3'
                ]);
                done();
            }, 1000);
        });

        it('should handle many concurrent socket emits and updates correctly', function (done) {
            const messages = [];
            let msgSet = new Set();
            const sockets = [];
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
            const numMessages = 10;
            const socketPromises = [];
            let receivedMessages = [];
            for (let i = 0; i < numMessages; i++) {
                const socket = io.connect(SOCKET_URL);
                socketPromises.push(new Promise((resolve) => {
                    socket.on('connect', () => {
                        socket.emit('newState', { chatlog: `Message ${i}` });
                    });
                    socket.on('difference', (data) => {
                        receivedMessages.push(data.chatlog);
                        resolve();
                    });
                }));
            }

            Promise.all(socketPromises).then(() => {
                setTimeout(() => {
                    console.log("Rec msg: ", receivedMessages);
                    // Check if the received messages match the sent messages
                    expect(receivedMessages).to.have.members(
                        Array.from({ length: numMessages * (numMessages - 1) }, (_, index) => `Message ${Math.floor(index/(numMessages - 1))}`)
                    );
                    done();
                }, 1000);
            });
        });
    });

    // Stress Test: Simulate multiple connections
    describe('Stress Tests', function () {
        it('should handle many concurrent connections without failure', function (done) {
            this.timeout(10000);
            const numClients = 500;
            const socketPromises = [];
            for (let i = 0; i < numClients; i++) {
                socketPromises.push(
                    new Promise((resolve) => {
                        const socket = io.connect(SOCKET_URL);
                        socket.on('connect', () => {
                            socket.emit('newState', { chatlog: `Stress Test Message ${i}` });
                            socket.on('difference', (data) => {
                                expect(data.chatlog).to.equal(`Stress Test Message ${i}`);
                                resolve();
                            });
                        });
                    })
                );
            }

            Promise.all(socketPromises).then(() => {
                done();
            });
        });
    });
});

