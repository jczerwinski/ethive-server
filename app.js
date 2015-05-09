'use strict';
var config = require('./config/config');

var mongoose = require('mongoose');
var servers = require('./lib/servers');
mongoose.connect(servers.mongo);
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
var fs = require('fs');
var compress = require('koa-compress');
var logger = require('koa-logger');
var serve = require('koa-static');
var koa = require('koa');
var bodyParser = require('koa-body-parser');
var path = require('path');
var http = require('http');
var https = require('https');
var forceSSL = require('koa-force-ssl');

var auth = require('./lib/auth');
var api = require('./api/api');


var app = module.exports = koa();
// Error Handling
app.use(function * (next) {
	try {
		yield next;
	} catch (err) {
		this.status = 500;
		this.app.emit('error', err, this);
	}
});

// Log
app.use(logger());

// Security - SSL? TODO.
//app.use(forceSSL(config.app.https_port));

// Parse
app.use(bodyParser());

// Auth
app.use(auth.initialize());

// api
app.use(api.routes());

// host static documentation -- assumes is pre-built
app.use(serve('doc'));

// Compress
app.use(compress());

var httpsOptions = { // TODO -- Check if this is acceptable for production
	key: fs.readFileSync('server.key'),
	cert: fs.readFileSync('server.crt'),
	requestCert: false,
	rejectUnauthorized: false
};

if (!module.parent) {
	http.createServer(app.callback()).listen(config.get('servers:api:port'));
	// TODO SSL
	//https.createServer(httpsOptions, app.callback()).listen(config.https_port);
	console.log('listening on port ' + config.get('servers:api:port'));
}