module.exports.providers = {};
module.exports.providers.show = function * (next) {
	var provider = providersHash[this.params.id];
	if (provider) {
		this.body = provider;
	} else {
		this.throw(404);
	}
	yield next;
};

module.exports.providers.offers = {};
module.exports.providers.offers.show = function *(next) {
	var provider = providersHash[this.params.providerID];
	if (!provider) {
		this.throw('Cannot find provider', 404);
	}
	var offer = provider.offers.find(function (offer) {
		return offer.id == this.params.offerID;
	}, this);
	if (!offer) {
		this.throw(404);
	}
	this.body = offer;
	yield next;
};