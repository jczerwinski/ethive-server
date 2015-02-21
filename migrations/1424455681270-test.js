var config = require('konfig')();
var mongoose = require('mongoose');
mongoose.connect(config.app.mongodb);
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
var Service = require('../models/Service.js');
var Provider = require('../models/Provider.js');
var Offer = require('../models/Offer.js');
exports.up = function(next){
    // Ensure all Service models have valid status
    Service.update({
        status: null
    }, {
        status: 'draft'
    }, {
        multi: true
    }, next);
};

exports.down = function(next){
    // Can't really migrate down -- non-reversible operation. Modifies documents in a way that isn't recoverable without backup.
  next();
};
