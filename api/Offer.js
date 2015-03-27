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