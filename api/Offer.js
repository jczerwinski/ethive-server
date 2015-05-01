var OfferModel = require('../models/Offer');

var Offer = module.exports = {};

Offer.show = function * (next) {
	var offer = yield OfferModel.findOneAsync({_id: this.params.id});
	if (offer) {
		this.body = yield offer.show(this.user);
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
		if (offer.isAdministeredBy(this.user)) {
			yield offer.update(this.req.body)
			this.status = 204;
		} else {
			this.status = 403;
		}
	} else {
		this.status = 404;
	}
	yield next;
};

Offer.delete = function * (next) {
	var offer = yield OfferModel.FindAndPopulate(this.params.id);
	if (offer) {
		if (offer.isAdministeredBy(this.user)) {
			yield offer.remove();
			this.status = 204;
		} else {
			this.status = 403;
		}
	} else {
		this.status = 404;
	}
	yield next;
};