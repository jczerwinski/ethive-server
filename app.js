'use strict';
var api = require('./api/api');
var compress = require('koa-compress');
var logger = require('koa-logger');
var serve = require('koa-static');
var router = require('koa-router');
var koa = require('koa');
var bodyParser = require('koa-body-parser');
var path = require('path');
var cors = require('koa-cors'); // Get rid of this...
var passport = require('koa-passport');
var LocalStrategy = require('passport-local').Strategy;
var app = module.exports = koa();
var User = require('./models/User');

app.use(bodyParser());
// Authentication Policy
passport.use(new LocalStrategy({
		usernameField: 'email'
	},
	function(email, password, done) {
		User.findOne({
			email: email
		})
			.then(function(user) {
				if (!user) {
					return done(null, false);
				}
				if (!user.verifyPassword(password)) {
					return done(null, false);
				}
				return done(null, user);
			})
			.catch(function(err) {
				return done(err);
			});
	}
));
app.use(passport.initialize());


// Logger
app.use(logger());
app.use(cors());


app.use(router(app));

/*app.use(jwt({
	secret: 'test'
}));*/

app
	.get(
		'/api/services',
		api.services.index)
	.get(
		'/api/services/:id',
		api.services.show)
	.get('/api/providers/:id', api.providers.show)
	.get('/api/providers/:providerID/offers/:offerID', api.providers.offers.show)
	.post('/api/login', passport.authenticate('local', {
		session: false
	}), function * () {
		console.log(this.req.user)
		this.body = new Token(this.req.user);
	});

/*.post('/api/login',
		function * (next) {
			var ctx = this;
			yield passport.authenticate('local', {
				session: false
			}, function * (err, user, info) {
				if (err) throw err;
				if (user === false) {
					ctx.status = 401;
					ctx.body = {
						success: false
					};
				} else {
					yield ctx.login(user);
					ctx.body = {
						success: true
					};
				}
			}).call(this, next);
		}*/
// Serve static files
app.use(serve(path.join(__dirname, 'webapp/app'))); // In development env... for now!

// Compress
app.use(compress());

if (!module.parent) {
	app.listen(3000);
	console.log('listening on port 3000');
}