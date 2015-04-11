var OfferModel = require('../models/Offer');

var Offer = module.exports = {};

Offer.show = function * (next) {
	var user = this.user;
	var offer = yield OfferModel.findOneAsync({_id: this.params.id}).then(function (offer) {
		return offer.show(user);
	});
	if (!offer) {
		this.status = 404;
	} else {
		this.status = 200;
		this.body = offer;
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