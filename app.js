'use strict';
var config = require('konfig')();
var mongoose = require('mongoose');
mongoose.connect(config.app.mongodb);
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));

var fs = require('fs');
var compress = require('koa-compress');
var logger = require('koa-logger');
var serve = require('koa-static');
var router = require('koa-router');
var koa = require('koa');
var bodyParser = require('koa-body-parser');
var path = require('path');

var User = require('api/User');
var Service = require('api/Service');
var Provider = require('api/Provider');

var http = require('http');
var https = require('https');
var forceSSL = require('koa-force-ssl');

var auth = require('lib/auth');


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
// Logger
app.use(logger());

// Security
app.use(forceSSL(config.app.https_port));

app.use(bodyParser());

// Auth
app.use(auth.initialize());

app.use(router(app));
app
	.post('/api/auth', auth)
	.get('/api/services', Service.index)
	.get('/api/services/:id', Service.show)
	.post('/api/services', Service.create)
	.put('/api/services/:id', Service.save)

	// User
	.get('/api/user', User.show)
	.post('/api/user', User.save)
	.get('/api/verifyEmail/:emailVerificationKey', User.verifyEmail)

	// Provider
	.post('/api/providers', Provider.create)
	.get('/api/providers/:id', Provider.show)
	.get('/api/providers/:providerID/offers/:offerID', Provider.offers.show);

// Serve static files
app.use(serve(path.join(__dirname, 'webapp/app'))); // In development env... for now!

// Compress
app.use(compress());

var httpsOptions = { // TODO -- Check if this is acceptable for production
	key: fs.readFileSync('server.key'),
	cert: fs.readFileSync('server.crt'),
	requestCert: false,
	rejectUnauthorized: false
};

if (!module.parent) {
	http.createServer(app.callback()).listen(config.app.http_port);
	https.createServer(httpsOptions, app.callback()).listen(config.app.https_port);
	console.log('listening on port ' + config.app.http_port + ', ssl on port ' +config.app.https_port);
}