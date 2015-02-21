/**
 * Design note: A given provider can have multiple offers for the "same" configuration. This is easier to enforce and lets us be liberal in adding details to offers while not worrying too much if they are "duplicates" of each other. Less constraining in general. The drawback is that suppliers could "spam" the market. This can be prevented by collapsing all of a given provider's offers into a single view so as to prevent such spam.
 *
 * Prime use cases: find all offers for a provider.
 *
 *      - Find all offers for a service
 *          - Sort, datatable view, batch editing? etc.
 *      - Find all offers for a service by location
 *      - Essentially lots of queries on offers
 *
 * Some design constraints:
 *     - Don't want to reference offers from Services or Providers -- the set of offers could be much too big!
 *     - Must reference, and should probably index Service from/on Offers, for queries.
 *     - Service ID's are already guaranteed to be immutable, so it supports this.
 *
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var Promise = require('bluebird');

var OfferSchema = Schema({
    // Auto gen _id
    service: {
        required: true,
        type: String,
        ref: 'Service'
    },
    visibility: {
        type: String,
        enum: ['public', 'draft']
    },
    description: {
        type: String
    },
    provider: {
        required: true,
        type: String,
        ref: 'Provider'
    },
    price: {
        // Should be from this list, but don't bother enforcing: http://openexchangerates.org/currencies.json
        // Just deal with errors gracefully on the client side.
        currency: {
            required: true,
            type: String
        },
        amount: {
            required: true,
            type: Number,
            min: 0
        }
    },
    location: {
        required: true,
        type: String
    }
}, {
    // False does not work when attempting to save documents. Bug in mongoose.
    _id: true
});

/*OfferSchema.path('price').validate(function (value) {
    
}, 'Invalid currency');*/

OfferSchema.methods.create = function () {
    // Allows multiple offers per provider/service combo. This is to facilitate 
};

OfferSchema.methods.show = function(user) {
    var offer = this;
    // Attach service. Only really need the name. Also need the provider for 
    
    if (offer.isAdministeredBy(user)) {
        // Show all to admin
        
    } else {
        // User isn't admin.
        if (offer.visibility === 'public') {
            // Show public version if public.
        } else {
            // Show nothing if not public
            return Promise.cast(null);
        }
    }
};

// Synchronous. Requires populated ancestors.
OfferSchema.methods.isAdministeredBy = function isAdministeredBy(user) {
    if (!user) return false;
    if (this.admins.some(function(admin) {
        return admin === user._id;
    })) return true;
    return false;
};

var OfferModel = mongoose.model('Offer', OfferSchema);
Promise.promisifyAll(OfferModel);
Promise.promisifyAll(OfferModel.prototype);

module.exports = OfferModel;