'use strict';
var http = require('http');
var config = require('./config/config');
var servers = require('./lib/servers');
require('./lib/db');
var app = module.exports = require('koa')()
.use(require('koa-cors')({
	origin: servers.web,
	headers: 'Authorization,Content-Type'
}))
.use(require('./lib/handleErrors'))
.use(require('koa-logger')())
.use(require('koa-body-parser')())
.use(require('./lib/auth').initialize())
.use(require('./api/api').routes())
.use(require('koa-static')('doc'))
.use(require('koa-compress')());

if (!module.parent) {
	http.createServer(app.callback()).listen(config.get('PORT') || config.get('servers:api:port'));
	console.log('listening on port ' + (config.get('PORT') || config.get('servers:api:port')));
}