var OfferModel = require('../models/Offer');

var Offer = module.exports = {};

Offer.show = function * (next) {
	var offer = yield OfferModel.findOneAsync({_id: this.params.id});
	if (!offer) {
		this.status = 404;
	} else {
		this.status = 200;
		this.body = yield offer.show(this.user);
	}
	yield next;
};

Offer.save = function * (next) {
	var offer = yield OfferModel.FindAndPopulate(this.params.id);
	if (offer) {
		if (offer.isAdministeredBy(this.user)) {
			offer.set(this.req.body);
			yield offer.save();
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