// Database config
var mongoose = require('mongoose');
var servers = require('./servers');
console.log(servers.mongo)
mongoose.connect(servers.mongo);
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));