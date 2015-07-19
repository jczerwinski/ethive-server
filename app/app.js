'use strict';
require("appdynamics").profile({
    controllerHostName: 'paid138.saas.appdynamics.com',
    controllerPort: 443, // If SSL, be sure to enable the next line     controllerSslEnabled: true // Optional - use if connecting to controller via SSL
    accountName: 'ethive', // Required for a controller running in multi-tenant mode
    accountAccessKey: '281v5z9q8k7j', // Required for a controller running in multi-tenant mode
    applicationName: 'ethive',
    tierName: 'api',
    nodeName: 'process' // The controller will automatically append the node name with a unique number
});
var http = require('http');
var config = require('./config/config');
var servers = require('./lib/servers');
require('./lib/db');
var app = module.exports = require('koa')()
.use(require('koa-cors')({
	origin: servers.web,
	headers: 'Authorization,Content-Type',
	methods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS'
}))
.use(require('./lib/handleErrors'))
.use(require('koa-logger')())
.use(require('koa-body-parser')())
.use(require('./lib/auth').initialize())
.use(require('./api/api').routes())
.use(require('koa-static')('doc'))
.use(require('koa-compress')());

if (!module.parent) {
	http.createServer(app.callback()).listen(config.servers.api.port);
	console.log('listening on port ' + config.servers.api.port);
}