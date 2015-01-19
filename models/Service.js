var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Promise = require('bluebird');
var promiseWhile = require('../lib/promiseWhile.js');

var ServiceSchema = Schema({
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
	parent: {
		type: String,
		ref: 'Service',
		validate: function(value, respond) {
			// TODO -- needs to be tested
			var service = this;
			// Services must have existing parents.
			return this.constructor.findOneAsync({
				_id: value
			}).then(function(newParent) {
				if (newParent) {
					return newParent.populateAncestors().then(function() {
						return respond(!newParent.hasAncestor(service));
					})
				} else {
					return respond(false);
				}
			});
		}
	},
	type: {
		// Categories can have children, but not offers. Services can have offers, but not children.
		type: String,
		enum: ['category', 'service'],
		required: true
	},
	status: {
		type: String,
		enum: ['draft', 'published']
	},
	description: {
		type: String
	},
	terms: {
		type: String
	},
	admins: {
		type: [String],
		ref: 'User'
	},
	// Not to be saved to DB. Only here to allow for population without needing to store references necessarily
	children: {},
	offers: {}
}, {
	// False does not work when attempting to save documents. Bug in mongoose.
	_id: true
});

// Ensure children and offers are not set on saved services. They should be dynamically generated.
ServiceSchema.pre('save', function(next) {
	this.children = undefined;
	this.offers = undefined;
	next();
});

// Gives an index of all services. Indexed versions include _id, name, description, type, and children.
ServiceSchema.statics.index = function(user) {
	return this.findAsync().then(function(services) {
		var map = services.reduce(function (map, service) {
			map[service._id] = service;
			return map;
		}, {});
		var forest = [];
		services.forEach(function (service) {
			if (service.parent === undefined) {
				forest.push(service);
			} else {
				var parent = map[service.parent];
				if (parent.children) {
					parent.children.push(service);
				} else {
					parent.children = [service];
				}
			}
		});
		return forest;
	});
};

ServiceSchema.methods.populateChildren = function getChildren() {
	var service = this;
	if (this.type === 'category') {
		return this.constructor.findAsync({
			parent: this.id
		}).then(function(children) {
			service.children = children;
			return service;
		});
	}
	if (this.type === 'service') {
		/*return mongoose.model('Offer').findAsync({
			service: this.id
		}).then(function(offers) {
			service.offers = offers;
			return service;
		});*/
	}
	return new Promise(function(resolve, reject) {
		return resolve(service);
	});
};

/**
 * Recursively populates this service's parent and its ancestors.
 * @return {Service} This service, for method chaining.
 */
ServiceSchema.methods.populateAncestors = function populateAncestors() {
	var ctx = this;
	if (this.populated('parent')) {
		return Promise.cast(this);
	} else {
		return this.populateAsync('parent').then(function(service) {
			return service.parent ? service.parent.populateAncestors() : Promise.cast(ctx);
		});
	}
};

// Requires populateAncestors first
ServiceSchema.methods.hasAncestor = function hasAncestor(ancestor) {
	if (this.parent) {
		if (this.parent._id === (ancestor._id || ancestor)) {
			return true
		}
		return this.parent.hasAncestor(ancestor);
	} else {
		return false;
	}
};

/**
 * Provides a ready-for-http transformation of this Service.
 * @param  {User} user The user we wish to show this Service.
 * @return {ServiceObject} A plain object transformation of this Service.
 */
ServiceSchema.methods.show = function(user) {
	var service = this;
	//needs ancestors, userIsAdmin, children, offers. check if draft...
	return this.populateAncestors().then(function() {
		if (service.isAdministeredBy(user)) {
			// Admin requesting service. 
			return service.showAdmin();
		} else {
			// Not an admin
			if (service.isDraft()) {
				return Promise.cast(null);
			} else {
				// Public service requested by public user. Show it as public.
				return service.showPublic();
			}
		}
	});
};

ServiceSchema.methods.showAdmin = function showAdmin() {
	return this.populateChildren().then(function(service) {
		return service.toObject();
	});
};

ServiceSchema.methods.showPublic = function showPublic() {
	return this.populateChildren().then(function(service) {
		var public = service.toObject();
		// Remove private info!!! Maybe mongoose supports hooks for this? TODO
		delete service.admins;
		// TODO Private/draft descendent services should not be visible!? Think about this first.
		// Promise?
		if (service.parent) service.parent = service.parent.showPublic();
		return service;
	});
};

// Synchronous. Requires populated ancestors first.
ServiceSchema.methods.isAdministeredBy = function isAdministeredBy(user) {
	if (!user) return false;
	if (this.admins.some(function(admin) {
		return admin === user._id;
	})) return true;
	return this.parent ? this.parent.isAdministeredBy(user) : false;
};

// Checks ancestors, this for draft status. Ancestors must already be populated.
ServiceSchema.methods.isDraft = function isDraft() {
	return this.type === 'draft' || this.parent ? this.parent.isDraft() : false;
};

var ServiceModel = mongoose.model('Service', ServiceSchema);

Promise.promisifyAll(ServiceModel);
Promise.promisifyAll(ServiceModel.prototype);

module.exports = ServiceModel;