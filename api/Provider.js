var Responder = require('../lib/Responder');
var ProviderModel = require('../models/Provider');

var Provider = module.exports = {};

Provider.create = function * (next) {
    var existingProvider = yield ProviderModel.findOneAsync({
        _id: this.req.body._id
    });
    if (existingProvider) {
        // Do not overwrite existing providers on Create requests
        this.status = 403; // Forbidden
    } else {
        // Create
        var provider = new ProviderModel(this.req.body);
        this.status = yield provider.saveAsync().then(function(provider) {
            // Creation successful!
            return 200;
        }).catch(Responder.save.failure.status);
    }
    yield next;
};

Provider.update = function * (next) {
    var existingProvider = yield ProviderModel.findOneAsync({
        _id: this.req.body._id
    });
    if (existingProvider) {
        // Update
        if (existingProvider.isAdministeredBy(this.user)) {
            // Can Update!
            existingProvider.set(this.req.body);
            this.status = yield existingProvider.saveAsync().then(function() {
                return 200;
            }).catch(Responder.save.failure.status);
        } else {
            // Not authorized!
            this.status = 403;
        }
    } else {
        this.status = 404; // Not found
    }
};

Provider.show = function * (next) {
    var provider = yield ProviderModel.findOneAsync({
        _id: this.params.id
    });
    if (provider) {
        // Found it!
        this.body = yield provider.show(this.user);
        // OK if something, unauthorized if not.
        this.status = this.body ? 200 : 403; 
    } else {
        // No such provider.
        this.status = 404;
    }
    yield next;
};

Provider.offers = {};
Provider.offers.show = function * (next) {
    this.status = 404;
    /*var provider = providersHash[this.params.providerID];
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
    yield next;*/
};