'use strict';

var http = require('http');
var https = require('https');

var config = require('./config/config');
require('./lib/db');

var app = module.exports = require('koa')()
.use(require('./lib/handleErrors'))
.use(require('koa-logger')())
//app.use(require('koa-force-ssl')(config.app.https_port)); TODO
.use(require('koa-body-parser')())
.use(require('./lib/auth').initialize())
.use(require('./api/api').routes())
.use(require('koa-static')('doc'))
.use(require('koa-compress')());

//var fs = require('fs');
var httpsOptions = { // TODO
	// key: fs.readFileSync('server.key'),
	// cert: fs.readFileSync('server.crt'),
	// requestCert: false,
	// rejectUnauthorized: false
};

if (!module.parent) {
	// TODO SSL
	//https.createServer(httpsOptions, app.callback()).listen(config.https_port);
	http.createServer(app.callback()).listen(config.get('PORT') || config.get('servers:api:port'));
	console.log('listening on port ' + config.get('PORT') || config.get('servers:api:port'));
}