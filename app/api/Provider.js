var ProviderModel = require('../models/Provider');
var OfferModel = require('../models/Offer');
var Promise = require('bluebird');
var UserModel = require('../models/User');
var ServiceModel = require('../models/Service');
var Provider = module.exports = {};

/**
 * Discards admins.
 * @param {Function} next          [description]
 * @yield {[type]}   [description]
 */
Provider.create = function* (next) {
	var provider = yield ProviderModel.findOneAsync({
		id: this.req.body.id
	});
	if (provider) {
		// Do not overwrite existing providers on Create requests. Forbidden.
		this.status = 403;
	} else {
		// Must be authenticated
		if (this.state.user) {
			// Create
			// Prep doc
			var doc = this.req.body;
			doc.admins = [this.state.user._id];
			provider = new ProviderModel(doc);
			try {
				yield provider.save();
				this.status = 201;
			} catch (err) {
				if (err.name === 'ValidationError') {
					this.status = 400;
				} else {
					throw err;
				}
			}
		}
	}
	yield next;
};

Provider.update = function * (next) {
	var provider = yield ProviderModel.findOneAsync({
		id: this.params.id
	});
	if (provider) {
		// Update
		yield provider.populateAdmins();
		if (provider.isAdministeredBy(this.state.user)) {
			// Prep updates
			// Can Update!
			var update = yield provider.update(this.req.body);
			this.status = update ? 200 : 400;
		} else {
			// Not authorized!
			this.status = 403;
		}
	} else {
		// Not Found.
		this.status = 404;
	}
	yield next;
};

Provider.show = function* (next) {
	var provider = yield ProviderModel.findOneAsync({
		id: this.params.id
	});
	if (provider) {
		// Found it!
		this.body =	yield provider.show(this.state.user);
		// OK if something, unauthorized if not.
		this.status = this.body ? 200 : 403;
	} else {
		// No such provider.
		this.status = 404;
	}
	yield next;
};

Provider.delete = function* (next) {
	var provider = yield ProviderModel.findOneAsync({
		id: this.params.id
	});
	if (provider) {
		if (provider.isAdministeredBy(this.state.user)) {
			// Delete away
			yield provider.delete();
			this.status = 204;
		} else {
			// Forbidden
			this.status = 403;
		}
	} else {
		// Not found
		this.status = 404;
	}
	yield next;
};

Provider.offers = {};

Provider.offers.create = function* (next) {
	var provider = yield ProviderModel.findOneAsync({
		id: this.params.providerID
	});
	if (provider) {
		if (provider.isAdministeredBy(this.state.user)) {
			// Create
			var offer = this.req.body;
			// Add the provider to the offer -- doesn't have to be provided on the object in requests through their providers
			offer.provider = provider._id;
			offer.service = yield ServiceModel.TranslateId(offer.service);
			var ctx = this;
			yield OfferModel.createAsync(offer).then(function (offer) {
				ctx.body = offer.toObject();
				ctx.status = 201;
			}).catch(function (err) {
				if (err.name === 'ValidationError') {
					ctx.status = 400;
				} else {
					throw err;
				}
			});
		} else {
			this.status = 403;
		}
	} else {
		// Provider not found
		this.status = 404;
	}
	yield next;
};