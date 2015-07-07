var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Promise = require('bluebird');

var Service = mongoose.model('Service');
var User = mongoose.model('User');

var ObjectId = mongoose.SchemaTypes.ObjectId;

var ProviderSchema = Schema({
	name: {
		type: String,
		required: true
	},
	id: {
		type: String,
		required: true,
		lowercase: true,
		unique: true,
		match: /^[a-z0-9-]{1,}$/
	},
	ownership: {
		type: String,
		enum: ['ethive', 'private']
	},
	description: {
		type: String
	},
	admins: {
		type: [{
			type: ObjectId,
			ref: 'User'
		}]
	}
}, {
	toObject: {
		virtuals: true
	}
});

ProviderSchema.virtual('offers').get(function () {
	return this.__offers;
});

ProviderSchema.virtual('offers').set(function (offers) {
	this.__offers = offers;
});

/**
 * Public API
 */

/**
 * [Publify description]
 * @param {[type]} provider [description]
 */
ProviderSchema.statics.Publify = function Publify(provider) {
	if (provider.offers) {
		provider.offers = provider.offers.map(function (offer) {
			offer.service = Service.Publify(offer.service);
			return offer;
		});
	}
	delete provider.admins;
	return provider;
};

/**
 * Whether or not this Provider is administered by the given User
 * @param  {User}  user The user to test
 * @return {Boolean}      Whether or not user admins this Provider
 * @public
 * @instance
 */
ProviderSchema.methods.isAdministeredBy = function isAdministeredBy(user) {
	if (!user) return false;
	return this.admins.some(function (admin) {
		return user.equals(admin);
	});
};

/**
 * Populate this Providers admins
 * @return {Promise} Resolves this Provider.
 * @public
 * @instance
 */
ProviderSchema.methods.populateAdmins = function populateAdmins () {
	return this.populateAsync({
		path: 'admins',
		select: 'username _id',
		options: {
			lean: true
		}
	});
};

/**
 * Sets and saves changes to this Provider.
 *
 * Requires populated admins
 *
 * @param {Object} updates       The paths to update
 * @yield {Promise} whatever this.save() returns
 * @public
 * @instance
 */
ProviderSchema.methods.update = function * (updates) {
	this.set(updates);
	try {
		yield this.saveAsync();
		return this;
	} catch (err) {
		if (err.name === 'ValidationError') {
			return false;
		}
		throw err;
	}
};

/**
 * Deletes this Provider
 * @return {Promise} whatever this.removeAsync() returns
 * @public
 * @instance
 */
ProviderSchema.methods.delete = function () {
	var provider = this;
	// Find and delete everything owned by this provider
	// Offers
	return mongoose.model('Offer').removeAsync({provider: this._id}).then(function () {
		// That's it. Delete the Provider
		return provider.removeAsync();
	});
};

/**
 * Generates a plain-old javascript object from this Provider. The object generated is suitable for use and viewing by the given user.
 *
 * @param  {User} [user] The user making the request.
 * @return {Promise} A promise that will be fulfilled with the requested Provider, or null if not authorized to view. Will be populated with offers.
 */
ProviderSchema.methods.show = function show (user) {
	var provider = this;
	if (provider.isAdministeredBy(user)) {
		return this.showAdmin();
	} else {
		return this.showPublic();
	}
};

ProviderSchema.statics.TranslateId = function TranslateId (id) {
	return findOneAsync({id: id}, '_id', {lean: true}).then(function (provider) {
		return provider ? provider._id : null;
	});
};

/**
 * Private
 */

ProviderSchema.methods.showAdmin = function * showAdmin () {
/*	yield this.populateAdmins();
	var provider = this.toObject();
	provider.offers = yield this.getOffers();
	return provider;*/
	yield this.populateAdmins();
	yield this.populateOffers();
	var provider = this.toObject();
	return provider
};

ProviderSchema.methods.showPublic = function showPublic () {
	// User isn't admin. Show only public offers. Maybe paginate? Maybe active only?
	return this.populatePublicOffers().then(function (provider) {
		return provider.toPublicObject();
	});
};


ProviderSchema.methods.getOffers = function getOffers() {
	// attach service to offers, too. need name especially
	// Do not attach offers for services that are not published
	var provider = this;
	return mongoose.model('Offer').find({
		provider: this._id
	}).populate('service').exec();
};

ProviderSchema.methods.populateOffers = function populateOffers() {
	var provider = this;
	return mongoose.model('Offer').find({
		provider: this._id
	}).populate('service').exec().then(function (offers) {
		provider.offers = offers;
	});
};

ProviderSchema.methods.populatePublicOffers = function populatePublicOffers() {
	// attach service to offers, too. name esp.
	var provider = this;
	return mongoose.model('Offer').find({
		// Find all this provider's offers...
		provider: this._id,
		// that are public
		status: 'public'
			// populate the offer's services...
	}).populate('service').exec().then(function (offers) {
		// and populate these serivces ancestors. We need this to check if the service is published.
		return Promise.each(offers, function (offer) {
			return offer.service.populateAncestors();
		});
	}).then(function (offers) {
		// Remove offers for unpublished services
		provider.offers = offers.filter(function (offer) {
			return offer.service.isPublished();
		});
		return provider;
	});
};

ProviderSchema.methods.toPublicObject = function toPublicObject() {
	return ProviderSchema.statics.Publify(this.toObject());
};

var ProviderModel = mongoose.model('Provider', ProviderSchema);
Promise.promisifyAll(ProviderModel);
Promise.promisifyAll(ProviderModel.prototype);

module.exports = ProviderModel;