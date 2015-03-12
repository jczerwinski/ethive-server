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
		// Need to ensure no cycles on parent, and that parent either exists or is null
		validate: function (parentID, respond) {
			var service = this;
			if (parentID === null) {
				// Null parent -- OK to add root level service.
				respond(true);
			}
			return this.constructor.findOneAsync({
				_id: parentID
			}).then(function (parent) {
				if (parent) {
					return parent.populateAncestors().then(function () {
						// No cycles allowed.
						return respond(!parent.hasAncestor(service));
					})
				} else {
					// Parent does not exist. Not allowed.
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
		enum: ['draft', 'published'],
		required: true
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
	_id: true,
	id: true,
	toObject: {
		virtuals: true,
		// Warning: toObject should only ever be called after children are populated. 
		transform: function transform (doc, ret, options) {
			if (typeof ret.parent === 'string') {
				ret.parentId = ret.parent;
				delete ret.parent;
			}
			/*ret.children.forEach(function (child) {
				delete child.children;
			});*/
		}
	}
});

var EXCLUDE_PRIVATE_SELECT_STRING = '-admins'

// Ensure children and offers are not set on saved services. They should be dynamically generated. TODO  Move to object definition?
ServiceSchema.pre('save', function (next) {
	// Only persist parent ID to db
	this.parent = this.parent && this.parent._id ? this.parent._id : this.parent;
	this.children = undefined;
	this.offers = undefined;
	next();
});

// Stopgap to support angular-restmod on the client. restmod requires populated fields and references to have different names. Should be fixed soon. See https://github.com/platanus/angular-restmod/issues/251
ServiceSchema.virtual('parentId').set(function (parentId) {
	this.parent = parentId;
});

ServiceSchema.virtual('parentId').get(function () {
	// Only attach parentId if parent isn't populated. See https://github.com/platanus/angular-restmod/issues/251
	return typeof this.populated('parent') ? undefined : this.parent;
});

// Gives an index of all services. Indexed versions include _id, name, description, type, and children. Admins are shown only if user administers the service.
ServiceSchema.statics.index = function index(user) {
	return this.findAsync({
		parent: undefined
	}).then(function (services) {
		return Promise.reduce(services, function (authorizedServices, service) {
			// Show to user, ready to go.
			return service.show(user).then(function (service) {
				if (service === null) return authorizedServices;
				authorizedServices.push(service);
				return authorizedServices;
			});
		}, []);
	});
};

/**
 * Provides a ready-for-http transformation of this Service.
 * @param  {User} user The user we wish to show this Service.
 * @return {ServiceObject} A plain object transformation of this Service. Null if the user is not authorized to view.
 */
ServiceSchema.methods.show = function show(user) {
	var service = this;
	//needs ancestors, children, offers. check if draft...
	return this.populateAncestors().then(function () {
		if (service.isAdministeredBy(user)) {
			// Admin requesting service. 
			return service.showAdmin();
		}
		// Not an admin
		if (service.isPublished()) {
			return service.showPublic();
		}
		// Hide
		return Promise.cast(null);
	});
};

/**
 * Recursively populates this service's parent and its ancestors. Does nothing if already populated or if no parent exists.
 * @return {Service} This service, wrapped in a promise, for method chaining.
 */
ServiceSchema.methods.populateAncestors = function populateAncestors() {
	var ctx = this;
	// If parent is already populated, or this service has no parent, return
	if (this.populated('parent') || this.parent === undefined) {
		return Promise.cast(this);
	} else {
		return this.populateAsync('parent').then(function (service) {
			return service.parent ? service.parent.populateAncestors() : Promise.cast(ctx);
		});
	}
};

// Synchronous. Requires populated ancestors first.
ServiceSchema.methods.isAdministeredBy = function isAdministeredBy(user) {
	if (!user) return false;
	if (this.admins.some(function (admin) {
			return admin === user._id;
		})) return true;
	return this.parent ? this.parent.isAdministeredBy(user) : false;
};

ServiceSchema.methods.showAdmin = function showAdmin() {
	return this.populateChildren(true).then(function (service) {
		service.children = service.children.map(function (child) {
			return child.toObject();
		});
		return service.toObject();
	});
};

ServiceSchema.methods.showPublic = function showPublic() {
	return this.populateChildren().then(function (service) {
		service.children = service.children.map(function (child) {
			return child.toPublicObject();
		});
		return service.toPublicObject();
	});
};

/**
 * Assumes that the service consists of ancestors and one layer of children or 
 * @return {[type]} [description]
 */
ServiceSchema.methods.toPublicObject = function toPublicObject() {
	if (this.parent && this.parent.toPublicObject) {
		this.parent = this.parent.toPublicObject();
	}
	/*if (this.children) {
		this.children = this.children.map(function (child) {
			return child.toObject();
		});
	}
	if (this.offers) {
		this.offers = this.offers.map(function (offer) {
			return offer.toObject();
		});
	}*/
	var service = this.toObject();
	delete service.admins;
	return service;
};

/**
 * Attaches this Service's children -- sub-services or offers, if any -- and returns itself as a promise.
 */
ServiceSchema.methods.populateChildren = function populateChildren(admin) {
	var service = this;
	if (this.type === 'category') {
		var query = {
			parent: this.id
		};
		var select = '';
		if (!admin) {
			query.status = 'published';
			select = EXCLUDE_PRIVATE_SELECT_STRING;
		}
		return this.constructor.findAsync(query, select).then(function (children) {
			service.children = children;
			return service;
		});
	}
	if (this.type === 'service') {
		// Service admins _can_ see  draft services. For support purposes.
		var query = {
			service: this.id
		};
		if (!admin) {
			query.status = 'public';
		}
		return mongoose.model('Offer').findAsync(query).then(function (offers) {
			service.offers = offers;
			return service;
		});
	}
	// Return the promise wrapped service by default
	return Promise.cast(service);
};

/**
 * Checks whether this Service is available to the public. A Service is available to the public if:
 *
 *   - It has a "published" status.
 *   - All its ancestors have a "published" status.
 *
 * @return {Boolean} `true` if available to the public. `false` otherwise.
 */
ServiceSchema.methods.isPublished = function isPublished() {
	return this.status === 'published' && (!this.parent || this.parent.isPublished());
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


var ServiceModel = mongoose.model('Service', ServiceSchema);

Promise.promisifyAll(ServiceModel);
Promise.promisifyAll(ServiceModel.prototype);

module.exports = ServiceModel;