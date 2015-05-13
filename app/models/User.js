var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var crypto = require('crypto');
var config = require('../config/config');
var sendgrid = require('sendgrid')(config.get('keys').sendgrid.user, config.get('keys').sendgrid.pass);
var Promise = require('bluebird');
var servers = require('../lib/servers');

Promise.promisifyAll(sendgrid);

function generateVerificationKey() {
	var howMany = 128;
	var chars = "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789";
	var rnd = crypto.randomBytes(howMany),
		value = new Array(howMany),
		len = chars.length;

	for (var i = 0; i < howMany; i++) {
		value[i] = chars[rnd[i] % len]
	};

	return value.join('');
}

var UserSchema = mongoose.Schema({
	username: {
		type: String,
		match: /^[a-zA-Z0-9_.]{3,20}$/,
		required: true,
		unique: true
	},
	// Derived from username in pre-validate hook below.
	lowercaseUsername: {
		type: String
	},
	password: {
		type: String,
		select: false,
		match: /^[a-zA-Z0-9!-_.]{8,}$/,
		required: true,
		set: function set(password) {
			return bcrypt.hashSync(password, 10);
		}
	},
	email: {
		type: String,
		required: true,
		lowercase: true,
		unique: true
	},
	name: {
		type: String
	},
	bruteForce: {
		type: {},
		default: function() {
			return {
				updated: Date.now(),
				value: 0
			};
		},
		select: false
	},
	emailVerificationKey: {
		type: String,
		default: generateVerificationKey,
		select: false
	},
	preferences: {
		currency: {
			type: String,
			maxlength: 3,
			minlength: 3,
			trim: true,
			uppercase: true,
			default: 'USD'
		}
	},
	// Should not be persisted. Temp only.
	providers: {}
});

// Derive uniqueUsername from username before validation.
UserSchema.pre('validate', function (next) {
	this.uniqueUsername = this.username.toLowerCase();
	next();
});

UserSchema.statics.TranslateId = function TranslateId (id) {
	return this.findOneAsync({username: id}, '_id', {lean: true}).then(function (user) {
		return user ? user._id : null;
	});
};

UserSchema.pre('save', function (next) {
	this.providers = undefined;
	next();
});

UserSchema.methods.isBruteForcing = function isBruteForcing() {
	var now = Date.now();
	// Linearly decrease the brute force counter at a rate of 10 per day
	this.bruteForce = {
		updated: now,
		value: Math.max(0, 1 + this.bruteForce.value - 10 * (now - this.bruteForce.updated) / (1000 * 60 * 60 * 24))
	};
};

UserSchema.methods.verifyPassword = function verifyPassword(password) {
	return bcrypt.compareSync(password, this.password);
};

UserSchema.methods.sendVerificationEmail = function sendVerificationEmail() {
	var mail = {
		from: 'info@ethive.com',
		to: this.email,
		subject: 'Welcome to Ethive!',
		text: 'Please confirm. ' + servers.api + '/verifyEmail/' + this.emailVerificationKey
	};
	return sendgrid.sendAsync(mail);
};

UserSchema.methods.isVerified = function isVerified() {
	return !this.emailVerificationKey;
};

UserSchema.methods.show = function show (user) {
	if (user.username === this.username) {
		// User wants his own account. Give everything.
		var thisUser = this;
		return mongoose.model('Provider').findAsync({
			admins: this._id
		}).then(function (providers) {
			thisUser.providers = providers;
			return thisUser;
		});
	} else {
		// Show nothing!
		return Promise.cast({});
	}
};

UserSchema.static('verifyEmail', function verifyEmailStatic(key) {
	return this.findOneAsync({
			emailVerificationKey: key
		})
		.then(function(user) {
			if (user) {
				// Found a user by this key! Delete the key.
				user.emailVerificationKey = '';
				return user.saveAsync();
			};
			// No such user.
			return null;
		});
});

var User = mongoose.model('User', UserSchema);
Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);
module.exports = User;