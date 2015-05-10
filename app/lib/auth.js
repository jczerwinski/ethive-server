var passport = require('koa-passport');
var jwt = require('koa-jwt');
var LocalStrategy = require('passport-local').Strategy;
var compose = require('koa-compose');
var UserModel = require('../models/User');

var secret = require('../config/config').get('jwtSecret');

// Authenticate route. Passes credentials to passport, returns a JWT token.
module.exports = function * (next) {
	var ctx = this;
	yield passport.authenticate('local', {
		session: false
	}, function * (err, user, info) {
		if (err) {
			throw err;
		}
		if (user === false) {
			ctx.status = 401;
			ctx.body = info;
		} else {
			// Clean user, attach a token.
			ctx.body = {
				username: user.username,
				token: jwt.sign({
					_id: user._id,
					username: user.username
				}, secret)
			};
		}
	}).call(this, next);
};

module.exports.initialize = function auth() {
	var passportMiddleware = passport.initialize();
	var jwtMiddleware = jwt({
		secret: secret,
		passthrough: true
	});

	var populateUserMiddleware = function * (next) {
		if (this.state && this.state.user) {
			this.state.user = yield UserModel.findOneAsync({
				_id: this.state.user._id
			});
		};
		yield next;
	};

	// Authentication Policy
	passport.use(new LocalStrategy(
		function(identifier, password, done) {
			UserModel.findOneAsync({
				$or: [{
					username: identifier
				}, {
					email: identifier
				}]
			}, '+password +bruteForce +emailVerificationKey')
				.then(function(user) {
					// Order matters!
					if (!user) {
						return done(null, false, {
							message: 'user'
						});
					}
					if (!user.isVerified()) {
						return done(null, false, {
							message: 'unverified'
						})
					}
					if (user.isBruteForcing()) {
						return done(null, false, {
							message: 'brute'
						});
					}
					if (!user.verifyPassword(password)) {
						return done(null, false, {
							message: 'password'
						});
					}
					return done(null, user);
				})
				.catch(function(error) {
					return done(error);
				});
		}
	)); // TODO - check for spamming/etc.
	return compose([passportMiddleware, jwtMiddleware, populateUserMiddleware]);
};