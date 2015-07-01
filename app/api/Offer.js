var OfferModel = require('../models/Offer');
var ProviderModel = require('../models/Provider');
var ServiceModel = require('../models/Service');

var Offer = module.exports = {};

Offer.show = function * (next) {
	var offer = yield OfferModel.findOneAsync({_id: this.params.id});
	if (offer) {
		this.body = yield offer.show(this.state.user);
		this.status = this.body ? 200 : 404;
	} else {
		// Offer not found
		this.status = 404;
	}
	yield next;
};

Offer.save = function * (next) {
	var offer = yield OfferModel.FindAndPopulate(this.params.id);
	if (offer) {
		if (offer.isAdministeredBy(this.state.user)) {
			yield offer.update(this.request.body)
			this.status = 204;
		} else {
			// Not authorized. Hide from non-admins -- not found.
			this.status = 404;
		}
	} else {
		this.status = 404;
	}
	yield next;
};

Offer.delete = function * (next) {
	var offer = yield OfferModel.FindAndPopulate(this.params.id);
	if (offer) {
		if (offer.isAdministeredBy(this.state.user)) {
			yield offer.remove();
			this.status = 204;
		} else {
			// Not authorized. Hide from non-admins -- not found.
			this.status = 404;
		}
	} else {
		this.status = 404;
	}
	yield next;
};

Offer.create = function* (next) {
	var offer = this.request.body;
	var provider = yield ProviderModel.findOneAsync({
		id: offer.provider
	});
	if (provider) {
		if (provider.isAdministeredBy(this.state.user)) {
			// Create
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