var OfferModel = require('../models/Offer');

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