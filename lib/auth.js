var passport = require('koa-passport');
var jwt = require('koa-jwt');
var LocalStrategy = require('passport-local').Strategy;
var compose = require('koa-compose');
var UserModel = require('../models/User.js');

var secret = 'a0o98ehUiuh303l4kharhk90dk9g9harcu'; // TODO Better.

module.exports.tokenize = function tokenize(user) {
	return jwt.sign({
		username: user.username,
	}, secret);
};

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
			var user = yield user.show(user);
			user = user.toObject();
			ctx.body = user;
		}
	}).call(this, next);
};

module.exports.initialize = function auth() {
	var passportMiddleware = passport.initialize();
	var jwtMiddleware = jwt({
		secret: secret,
		passthrough: true
	});
	// Authentication Policy
	passport.use(new LocalStrategy(
		function(username, password, done) {
			UserModel.findOneAsync({
				$or: [{
					_id: username
				}, {
					email: username
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
	return compose([passportMiddleware, jwtMiddleware]);
};