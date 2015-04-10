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
			this.status = 200;
		} else {
			this.status = 403;
		}
	} else {
		this.status = 403;
	}
	yield next;
};