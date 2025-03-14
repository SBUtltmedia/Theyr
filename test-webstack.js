const io = require('socket.io-client');
const redisMock = require('redis-mock');

const redis = redisMock.createClient({
    host: '127.0.0.1',
	port: 6379
})