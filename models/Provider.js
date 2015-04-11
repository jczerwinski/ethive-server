var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Promise = require('bluebird');

var ProviderSchema = Schema({
	name: {
		type: String,
		required: true
	},
	_id: {
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
		type: [String],
		ref: 'User'
	},
	// Not to be saved to DB. Only here to allow for population without needing to store references necessarily
	offers: {}
}, {
	// False does not work when attempting to save documents. Bug in mongoose.
	_id: true
});

// Ensure children and offers are not set on saved services. They should be dynamically generated.
ProviderSchema.pre('save', function (next) {
	this.offers = undefined;
	next();
});

/**
 * Generates a plain-old javascript object from this Provider. The object generated is suitable for use and viewing by the given user.
 *
 * @param  {User} [user] The user making the request.
 * @return {Promise} A promise that will be fulfilled with the requested Provider, or null if not authorized to view. Will be populated with offers.
 */
ProviderSchema.methods.show = function (user) {
	var provider = this;
	if (provider.isAdministeredBy(user)) {
		// Attach all this provider's offers.
		return provider.populateOffers().then(function (provider) {
			provider = provider.toObject();
			return provider;
		});
	} else {
		// User isn't admin. Show only public offers. Maybe paginate? Maybe active only?
		return provider.populatePublicOffers().then(function (provider) {
			return provider.toPublicObject();
		});
	}
};

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
 * [populateOffers description]
 * @return {[type]} [description]
 */
ProviderSchema.methods.populateOffers = function getOffers() {
	// attach service to offers, too. need name especially
	// Do not attach offers for services that are not published
	var provider = this;
	return mongoose.model('Offer').find({
		provider: this.id
	}).populate('service').exec().then(function (offers) {
		provider.offers = offers;
		return provider;
	});
};

ProviderSchema.methods.populatePublicOffers = function populatePublicOffers() {
	// attach service to offers, too. name esp.
	var provider = this;
	return mongoose.model('Offer').find({
		// Find all this provider's offers...
		provider: this.id,
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

var Service = mongoose.model('Service');


ProviderSchema.methods.toPublicObject = function toPublicObject() {
	return ProviderSchema.statics.Publify(this.toObject());
};

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

// Synchronous. Requires populated ancestors.
ProviderSchema.methods.isAdministeredBy = function isAdministeredBy(user) {
	function isUser(admin) {
		return admin === user._id;
	}
	return user ? this.admins.some(isUser) : false;
};

var ProviderModel = mongoose.model('Provider', ProviderSchema);
Promise.promisifyAll(ProviderModel);
Promise.promisifyAll(ProviderModel.prototype);

module.exports = ProviderModel;