var servers = require('../lib/servers');
var config = require('konfig')();

var UserModel = require('../models/User.js');

var User = {};
module.exports = User;

User.query = function * (next) {
	// Users can only see their own account. User accounts are private.
	if (this.query.username || this.query.email) {
		var query = {};
		if (this.query.username) query.username = this.query.username;
		if (this.query.email) query.email = this.query.email;
		var user = yield UserModel.findOneAsync(query);
		if (user) {
			if (this.state.user) {
				this.body = yield user.show(this.state.user);
				this.status = this.body ? 200 : 403;
			} else {
				this.status = 403;
			}
		} else {
			this.status = 404;
		}
	} else {
		this.status = 400;
	}
	yield next;
};

/**
 * @api {get} /users/:username
 * @apiName GetUser
 * @apiGroup User
 *
 * @apiParam {String} [username] The username of the user.
 */
User.show = function * (next) {
	// Users can only see their own account. User accounts are private.
	var user = yield UserModel.findOneAsync({username: this.params.username});
	if (user) {
		if (this.state.user) {
			// User found. Requestor logged in.
			this.body = yield user.show(this.state.user);
			setAdmin(this.body);
			this.status = this.body ? 200 : 403;
		} else {
			// Not logged in.
			this.status = 403;
		}
	} else {
		// User not found
		this.status = 404;
	}
	yield next;
};

function setAdmin (user) {
	if (user &&
		user.username &&
		Array.isArray(config.app.admins) &&
		config.app.admins.some(function (admin) {
			return admin === user.username;
		})) {
			user.isAdmin = true;
		}
}

User.save = function * (next) {
	var response = this;
	var existingUser = yield UserModel.findOneAsync({username: this.req.body.username});
	if (existingUser) {
		// Client error, bad request -- can't create existing user
		return response.status = 400;
	} else {
		// Create
		var user = new UserModel(this.req.body);
		this.status = yield user.saveAsync()
			.then(function(user) {
				return user[0].sendVerificationEmail().then(function() {
					// sent confirmation email
					return 201;
				}, function(err) {
					// Couldn't send confirmation email
					// remove could be async, but why? If it fails, not much we can do. account should be automatically purged, anyway, after a certain period of time.
					user[0].remove();
					// Pass err to koa
					throw err;
				});
			});
		yield next;
	}
};

User.verifyEmail = function * (next) {
	var user = yield UserModel.verifyEmail(this.params.emailVerificationKey).catch(function() {
		return null;
	});
	if (user) {
		this.redirect(servers.web + '/verifyEmailSuccess');
	} else {
		this.redirect(servers.web + '/verifyEmailFailure');
	}
	this.status = 301;
	yield next;
};