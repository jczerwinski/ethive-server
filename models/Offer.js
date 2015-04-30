/**
 * @overview Offer Model
 *
 * Offers belong to both a Service and a Provider.
 *
 * A Provider can have multiple Offers per  Service. This risks Providers spamming Services with Offers. This can be prevented by collapsing each Provider's Offers for a Service into a single view.
 *
 *
 * _id and id should be equal. For Offers, supporting a human-readable, url compatible String identifier doesn't add value.
 *
 * Don't reference Offers from Services or Providers -- the set of offers could be way too big.
 *
 * @todo  Index Offers heavily to support Location/Service queries.
 */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var mongooseTypes = require('mongoose-types');
mongooseTypes.loadTypes(mongoose);
var Url = mongoose.SchemaTypes.Url;
var Promise = require('bluebird');

var OfferSchema = Schema({
	// Auto gen _id
	service: {
		required: true,
		type: Schema.Types.ObjectId,
		ref: 'Service'
	},
	status: {
		type: String,
		enum: ['public', 'draft'],
		required: true
	},
	description: {
		type: String
	},
	landing: {
		type: Url,
		required: true
	},
	provider: {
		required: true,
		type: Schema.Types.ObjectId,
		ref: 'Provider'
	},
	price: {
		// Should be from this list, but don't bother enforcing: http://openexchangerates.org/currencies.json
		// Just deal with errors gracefully on the client side.
		currency: {
			required: true,
			type: String
		},
		amount: {
			required: true,
			type: Number,
			min: 0
		}
	},
	location: {
		required: true,
		type: String
	}
}, {
	id: true,
	toObject: {
		getters: true
	}
});

var Service = mongoose.model('Service');
var Provider = mongoose.model('Provider');

/**
 *
 * Public API
 *
 */

/**
 * Whether or not this Offer is administered by the given user. Offer's Service and Provider must first be populated, otherwise defaults to false.
 * @param  {User}  user The user to check for permissions
 * @return {Boolean}
 * @public
 */
OfferSchema.methods.isAdministeredBy = function isAdministeredBy(user) {
	if (!user) return false;
	if (this.service.isAdministeredBy(user)) {
		return true;
	}
	if (this.provider.isAdministeredBy(user)) {
		return true;
	}
	return false;
};

/**
 * Update this Offer. Expects POJO HTTP request body. Translates ids to _ids.
 *
 * @param {Object} updates       POJO HTTP request body of an Offer/patch
 * @yield {Promise} Whatever Mongoose save() returns
 * @public
 * @instance
 */
OfferSchema.methods.update = function * updates (updates) {
	// Fix service
	if (updates.service) {
		updates.service = yield Service.TranslateId(updates.service);
	}
	// Fix provider
	if (updates.provider) {
		updates.provider = yield Provider.TranslateId(updates.provider);
	}
	this.set(updates);
	yield this.save();
};


/**
 * Find an Offer by _id/id and populate its Service heirarchy and Provider
 * @param {String|ObjectId} An Offer's _id/id
 * @return {Promise} The Offer, or null if not found
 * @public
 * @static
 */
OfferSchema.statics.FindAndPopulate = function FindAndPopulate (_id) {
	return this.findOneAsync({
		_id: _id
	}).then(function (offer) {
		if (!offer) return null;
		return offer.populateAsync('service provider').then(function (offer) {
			return offer.service.populateAncestors().then(function () {
				return offer;
			});
		});
	});
};

OfferSchema.methods.show = function show (user) {
	var offer = this;
	// Attach service name, ID
	// Attach provider
	return offer.populateAsync('service provider').then(function (offer) {
		return offer.service.populateAncestors();
	}).then(function (service) {
		if (offer.isAdministeredBy(user)) {
			// Show all to admin
			return offer.showAdmin();
		} else {
			// User isn't admin.
			return offer.showPublic();
		};
	});
};

/**
 *
 * Private
 *
 */

OfferSchema.methods.showPublic = function showPublic () {
	if (this.isPublished()) {
		// Clean service, provider
		var offer = this.toObject();
		offer.service = Service.Publify(offer.service);
		offer.provider = Provider.Publify(offer.provider);
		return offer;
	} else {
		// Show nothing if not published
		return null;
	}
};

OfferSchema.methods.showAdmin = function showAdmin () {
	// Provider's admins needed
	return this.toObject();
};

/**
 * Whether or not this offer is published. Requires that this offer's service be attached and published.
 * @return {Boolean} Whether or not this offer is published.
 */
OfferSchema.methods.isPublished = function isPublished() {
	return this.status === 'public' && this.service.isPublished && this.service.isPublished();
};

/**
 * TODO: Validate Price -- Two validators? One for currency, one for amount? Maybe only one for currency since amount is automatic?
 */

var OfferModel = mongoose.model('Offer', OfferSchema);
Promise.promisifyAll(OfferModel);
Promise.promisifyAll(OfferModel.prototype);

module.exports = OfferModel;