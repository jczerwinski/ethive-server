var servers = require('../lib/servers');
var config = require('../config/config');

var UserModel = require('../models/User.js');

var User = {};
module.exports = User;

User.query = function * (next) {
	// Users can only see their own account. User accounts are private.
	if (this.query.username || this.query.email) {
		var query = {};
		if (this.query.username) query.lowercaseUsername = this.query.username.toLowerCase();
		if (this.query.email) query.email = this.query.email.toLowerCase();
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

User.patch = function * (next) {
	// Must be logged in
	if (this.state.user) {
		// Users can only patch themselves
		if (this.state.user.lowercaseUsername === this.params.username.toLowerCase()) {
			this.state.user.set(this.request.body);
			try {
				var result = yield this.state.user.saveAsync();
				// Success!
				this.status = 200;
			} catch (err) {
				if (err.name === 'ValidationError') {
					// Validation error.
					this.status = 400;
				} else {
					// Some kind of server error. Bubble up.
					throw err;
				}
			}
		} else {
			// Trying to patch someone else's account.
			this.status = 403;
		}
	} else {
		// Not logged in.
		this.status = 401;
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
	var user = yield UserModel.findOneAsync({lowercaseUsername: this.params.username.toLowerCase()});
	if (user) {
		if (this.state.user) {
			// User found. Requestor logged in.
			this.body = yield user.show(this.state.user);
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

User.save = function * (next) {
	var response = this;
	var existingUser = yield UserModel.findOneAsync({lowercaseUsername: this.request.body.username.toLowerCase()});
	if (existingUser) {
		// Client error, bad request -- can't create existing user
		return response.status = 400;
	} else {
		// Create
		var user = new UserModel(this.request.body);
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
	var user = yield UserModel.verifyEmail(this.params.emailVerificationKey);
	if (user) {
		this.status = 200;
	} else {
		this.status = 404;
	}
	yield next;
};

User.changePassword = function * (next) {
	var user = this.state.user;
	if (user) {
		if (user.lowercaseUsername === this.params.username.toLowerCase()) {
			if (user.verifyPassword(this.request.body.currentPassword)) {
				user.password = this.request.body.newPassword;
				try {
					var result = yield user.saveAsync();
					// Success!
					this.status = 200;
				} catch (err) {
					if (err.name === 'ValidationError') {
						// Validation error.
						this.status = 400;
					} else {
						// Some kind of server error. Bubble up.
						throw err;
					}
				}
			} else {
				// Forbidden -- wrong password
				this.status = 403;
			}
		} else {
			// Can only change the password of the user that is currently logged in
			this.status = 403;
		}
	} else {
		// Must be logged in and present a valid token to change password
		this.status = 401;
	}
	yield next;
};