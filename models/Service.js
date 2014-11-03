var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bluebird = require('bluebird');
var promiseWhile = require('../lib/promiseWhile.js');

var ServiceSchema = Schema({
	name: {
		type: String,
		required: true
	},
	parent: {
		type: String
	},
	id: {
		type: String,
		required: true,
		lowercase: true,
		unique: true,

	},
	// Should be calculated for now. Populate on write at some later date for improved read performance
	children: {
		type: Array
	},
	// Should be calculated for now. Populate on write at some later date for improved read performance
	ancestors: {
		type: Array
	},
	// Should be calculated for now. Populate on write at some later date for improved read performance
	offers: {
		type: Array
	},
	type: {
		type: String
	},
	description: {
		type: String
	},
	admins: {
		type: Schema.Types.ObjectId,
		ref: 'User'
	}
}, {
	_id: false
});

ServiceSchema.methods.getChildren = function () {
	return this.model(this.constructor.modelName).find({parent: this}).exec();
};

ServiceSchema.methods.show = function (user) {
	return this.populateAncestors().then(function (service) {
		console.log(service)
		if (service.isAdministeredBy(user)) {
			return service.populateChildren();
		} else {
			// Not an admin
			if (service.status === 'draft') {
				return null;
			} else {
				// Regular old service! Show it.
				delete service.admins;
				return service.populateChildren();
			}
		}
	});
};

// Populates 'parent' and 'ancestors' with Service objects.
ServiceSchema.methods.populateAncestors = function populateAncestors () {
	var service = this;
	return new Promise(function (resolve, reject) {
		// Populate parent first
		if (service.parent) {
			service.constructor.findOneAsync({
				id: service.parent
			}).then(function (parent) {
				service.parent = parent;
				// Set parent as first ancestor
				service.ancestors = [service.parent];
				var lastAncestor = service.parent;
				promiseWhile(function () {
					// Conditional
					return !!lastAncestor;
				}, function () {
					// Get the next ancestor, if any
					return service.constructor.findOneAsync({
						id: lastAncestor.parent
					}, 'id name parent admins').then(function (ancestor) {
						// Attach to the ancestors list
						if (ancestor) {
							service.ancestors.push(ancestor);
						}
						// Update the conditional
						lastAncestor = ancestor;
					});
				});
				return resolve(service);
			})
		} else {
			// No parent, no ancestors.
			return resolve(service);
		}
	});
};

ServiceSchema.methods.isAdministeredBy = function isAdministeredBy (user) {
	return false;
};


ServiceSchema.methods.populateChildren = function populateChildren () {
	// Get child services or offers - it can't have both. ie. it is either a "category" or a "service".
	var service = this;
	if (this.type === 'category') {
		return this.constructor.findAsync({
			parent: this.id
		}).then(function (children) {
			service.children = children;
			return service;
		});
	}
	if (this.type === 'service') {
		return mongoose.model('Offer').findAsync({
			service: this.id
		}).then(function (offers) {
			service.offers = offers;
			return service;
		});
	}
	return this;
};

var ServiceModel = mongoose.model('Service', ServiceSchema);
bluebird.promisifyAll(ServiceModel);
bluebird.promisifyAll(ServiceModel.prototype);

module.exports = ServiceModel;