var UserModel = require('../models/User.js');

var User = {};
module.exports = User;

/**
 * @api {post} /api/auth
 * @apiParam {String} username A User's username OR primary email address.
 * @apiParam {String} password A User's password
 * @apiSuccess {}
 */
User.auth = function * (next) {
	var ctx = this;
	yield passport.authenticate('local', {
		session: false
	}, function * (err, user, info) {
		if (err) {
			throw err;
		}
		if (user === false) {
			ctx.status = 403;
			ctx.body = info;
		} else {
			ctx.body = user.authToken();
		}
	}).call(this, next);
};

/**
 * @api {get} /user?username=:username&email=:email
 * @apiName GetUser
 * @apiGroup User
 *
 * @apiParam {String} [username] The username of the user. Optional.
 * @apiParam {String} [email] The email of the user. Optional.
 */
User.show = function * (next) {
	// Users can only see their own account. User accounts are private.
	if (this.query.username || this.query.email) {
		var query = {};
		if (this.query.username) query._id = this.query.username;
		if (this.query.email) query.email = this.query.email;
		var user = yield UserModel.findOneAsync(query);
		this.body = yield user.show(this.user);
		console.log(this.body)
		this.status = this.body ? 200 : 404;
	} else {
		this.status = 400;
	}
	yield next;
};

User.save = function * (next) {
	var existingUser = yield UserModel.findOneAsync({_id: this.req.body._id});
	if (existingUser) {
		// Update
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
						return 500;
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
		this.redirect('/verifyEmailSuccess');
	} else {
		this.redirect('/verifyEmailFailure');
	}
	this.status = 301;
	yield next;
};