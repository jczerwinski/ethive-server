var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Promise = require('bluebird');

var ProviderSchema = Schema({
    name: {
        type: String,
        required: true
    },
    _id: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        match: /^[a-z0-9-]{1,}$/
    },
    visibility: {
        type: String,
        enum: ['public', 'private']
    },
    ownership: {
        type: String,
        enum: ['ethive', 'private']
    },
    description: {
        type: String
    },
    admins: {
        type: [String],
        ref: 'User'
    },
    // Not to be saved to DB. Only here to allow for population without needing to store references necessarily
    offers: {}
}, {
    // False does not work when attempting to save documents. Bug in mongoose.
    _id: true
});

// Ensure children and offers are not set on saved services. They should be dynamically generated.
ProviderSchema.pre('save', function (next) {
    this.offers = undefined;
    next();
});
/**
 * [populateOffers description]
 * @return {[type]} [description]
 */
ProviderSchema.methods.populateOffers = function getOffers() {
    var provider = this;
    return mongoose.model('Offer').findAsync({
        provider: this.id
    }).then(function (offers) {
        provider.offers = offers;
        return provider;
    });
    return new Promise(function (resolve, reject) {
        return resolve(provider);
    });
};

ProviderSchema.methods.populatePublicOffers = function populatePublicOffers() {

};

/**
 * Generates a plain-old javascript object from this Provider. The object generated is suitable for use and viewing by the given user.
 *
 * @param  {User} user The user making the request, or undefined.
 * @return {Promise} A promise that will be fulfilled with the requested Provider, or null if not authorized to view. Will be populated with offers.
 */
ProviderSchema.methods.show = function (user) {
    var provider = this;
    if (provider.isAdministeredBy(user)) {
        // Attach all this provider's offers.
        return provider.populateOffers().then(function (provider) {
            provider = provider.toObject();
            provider.userIsAdmin = true;
            return provider;
        });
    } else {
        // User isn't admin.
        if (provider.visibility !== 'public') {
            // Hide if not public
            return Promise.cast(null);
        } else {
            // Attach public offers if public.
            return provider.populatePublicOffers();
        }
    }
};

// Synchronous. Requires populated ancestors.
ProviderSchema.methods.isAdministeredBy = function isAdministeredBy(user) {
    if (!user) return false;
    if (this.admins.some(function (admin) {
            return admin === user._id;
        })) return true;
    return false;
};

var ProviderModel = mongoose.model('Provider', ProviderSchema);
Promise.promisifyAll(ProviderModel);
Promise.promisifyAll(ProviderModel.prototype);

module.exports = ProviderModel;