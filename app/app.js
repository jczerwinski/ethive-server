'use strict';
require('newrelic');
var http = require('http');
var config = require('./config/config');
var servers = require('./lib/servers');
require('./lib/db');
var app = module.exports = require('koa')()
.use(require('kcors')({
	origin: servers.web,
	exposeHeaders: 'Authorization,Content-Type',
	allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS'
}))
.use(require('./lib/handleErrors'))
.use(require('koa-logger')())
.use(require('koa-body-parser')())
.use(require('koa-validate')())
.use(require('./lib/auth').initialize())
.use(require('./api/api').routes())
.use(require('koa-static')('doc'))
.use(require('koa-compress')());

if (!module.parent) {
	http.createServer(app.callback()).listen(config.servers.api.port);
	console.log('listening on port ' + config.servers.api.port);
}