var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Promise = require('bluebird');

var OfferSchema = Schema({
    // Auto gen _id
    service: {
        required: true,
        type: String,
        ref: 'Service'
    }
    visibility: {
        type: String,
        enum: ['public', 'draft']
    },
    description: {
        type: String
    }
}, {
    // False does not work when attempting to save documents. Bug in mongoose.
    _id: true
});

OfferSchema.methods.show = function(user) {
    var offer = this;
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