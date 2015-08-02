var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Promise = require('bluebird');
var tree = require('mongoose-path-tree');

var ObjectId = mongoose.SchemaTypes.ObjectId;

var ServiceSchema = Schema({
	name: {
		type: String,
		required: true,
		text: true
	},
	id: {
		type: String,
		required: true,
		lowercase: true,
		unique: true,
		match: /^[a-z0-9-]{1,}$/,
		index: true
	},
	parent: {
		type: Schema.Types.ObjectId,
		ref: 'Service',
		index: true,
		validate: [
			{
				validator: function (parent) {
					// Allow root level services
					if (parent === null) {
						return true;
					}
					// When saving or creating services, parent must always be set as a full parent model with all ancestors attached.
					if (!(parent instanceof ServiceModel)) {
						return false;
					}
					// Disallow cycles
					if (parent.hasAncestor(this)) {
						return false;
					}
					// Disallow giving non-category services sub-services
					if (parent.type === 'service') {
						return false;
					}
				},
				msg: 'error'
			}
		]
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
		type: [{
			type: ObjectId,
			ref: 'User'
		}]
	}
}, {
	toObject: {
		virtuals: true
		// Warning: toObject should only ever be called after children are populated.
	}
});

ServiceSchema.plugin(tree, {parentExists: true});

/**
 * Translate a String id to an ObjectId _id.
 * @param {String} id Service id
 * @return {ObjectId} Service _id, or undefined
 */
ServiceSchema.statics.TranslateId = function TranslateId (id) {
	// Allow root level services
	if (id === null) {
		return Promise.resolve(null);
	}
	return this.findOneAsync({id: id}, '_id', {lean: true}).then(function (service) {
		return service ? service._id : false;
	});
};

ServiceSchema.statics.GetById = function GetById (id) {
	// Allow root level services
	if (id === null) {
		return Promise.resolve(null);
	}
	return this.findOneAsync({id: id});
};

ServiceSchema.statics.GetWithAncestorsById = function GetWithAncestorsById (id) {
	return this.GetById(id).then(function (service) {

	});
};

var EXCLUDE_PRIVATE_SELECT_STRING = '-admins'

ServiceSchema.virtual('children').set(function (children) {
	this.__children = children;
});

ServiceSchema.virtual('children').get(function () {
	return this.__children;
});

ServiceSchema.virtual('offers').set(function (offers) {
	this.__offers = offers;
});

ServiceSchema.virtual('offers').get(function () {
	return this.__offers;
});

// Stopgap to support angular-restmod on the client. restmod requires populated fields and references to have different names. Should be fixed soon. See https://github.com/platanus/angular-restmod/issues/251
ServiceSchema.virtual('parentId').get(function () {
	// Only attach parentId if parent isn't populated. See https://github.com/platanus/angular-restmod/issues/251
	return typeof this.populated('parent') ? undefined : this.parent;
});

/**
 * Provides a flat collection of all services that the given User is permitted to view. Children are __not__ inlined.
 *
 * Use to provide clients with a full list of services -- for searching, building a navigable service tree, tabular display, etc.
 * @param  {User} user The User requesting the index.
 * @return {Service[]}
 */
ServiceSchema.statics.index = function index(user, options) {
	var query = {};
	if (options.level) {
		query.level = {
			$lte: options.level
		}
	};
	// For efficiency, we do things manually here.
	// First, get all our services.
	return this.findAsync(query).then(function (services) {
		// Next, index them by _id
		var index = services.reduce(function (index, service) {
			index[service._id] = service;
			return index;
		}, {});
		// Populate ancestors so we can check permissions.
		services = services.map(function (service) {
			service.parent = index[service.parent];
			return service;
		});
		// Done with the index. Remove for garbage collection
		index = null;
		// Remove services that the user doesn't administer OR that are not published. Process services for their intended viewer. Prep as POJO.
		services = services.reduce(function (services, service) {
			if (service.isAdministeredBy(user)) {
				// Show the service to an admin
				// POJO
				service = service.toObject({virtuals: false});
			} else if (service.isPublished()) {
				// Show a published service
				// POJO
				service = service.toObject({virtuals: false});
				// Remove admins
				delete service.admins;
			} else {
				// Not admin and not published. Don't show the service.
				return services;
			}
			// Dereference parent to flatten for transmission
			if (service.parent) {
				service.parentId = service.parent._id;
				delete service.parent;
			}
			services.push(service);
			return services;
		}, []);
		// We now have a flat list of services that are processed for the given user. Pass them along!
		return services;
	});
};

/**
 * Provides a ready-for-http transformation of this Service.
 * @param  {User} user The user we wish to show this Service.
 * @return {ServiceObject} A plain object transformation of this Service. Null if the user is not authorized to view.
 */
ServiceSchema.methods.show = function show(user) {
	//needs ancestors, children, offers. check if draft...
	return this.populateAncestors().then(function (service) {
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
 * Show multiple. Different from instance show -- does not populate children. Currently only designed to be used by Service Autosuggest
 */
ServiceSchema.statics.show = function *(services, user) {
	var ancestors = yield this.PopulateAncestors(services);
	services = services.map(function (service) {
		if (service.isAdministeredBy(user)) {
			return service.toObject();
		}
		if (service.isPublished()) {
			return service.toPublicObject();
		}
	});
	return services.filter(function (service) {
		return !!service;
	});
};

/**
 * Populates this services ancestors.
 * @return {Service} This service, wrapped in a promise.
 */
ServiceSchema.methods.populateAncestors = function populateAncestors() {
	return this.constructor.PopulateAncestors([this]).then(function (services) {
		return services[0];
	});
};

ServiceSchema.statics.PopulateAncestors = function PopulateAncestors (services) {
	return this.getAncestorsAsync(services).then(function (ancestors) {
		return services.map(function (service, index) {
			return attachAncestors(service, ancestors[index]);
		});
	});
};

function attachAncestors (service, ancestors) {
	ancestors.reduceRight(function (child, parent) {
		child.parent = parent;
		return parent;
	}, service);
	return service;
}

// Synchronous. Requires populated ancestors first.
ServiceSchema.methods.isAdministeredBy = function isAdministeredBy(user) {
	if (!user) return false;
	// Global admin
	return user.isAdmin() ||
		// Local admin
		this.hasAdmin(user) ||
		// Parent admin
		this.parent && this.parent.isAdministeredBy(user);
};

/**
 * Tests whether the given user is listed as an administer __on this particular service only__. Does not depend on ancestors.
 * @param {User} user User to test
 * @return {Boolean}
 */
ServiceSchema.methods.hasAdmin = function hasAdmin (user) {
	return this.admins.some(function (admin) {
		return user.equals(admin);
	});
};

ServiceSchema.methods.showAdmin = function showAdmin() {
	return this.populateChildren(true).then(function (service) {
		if (service.children) {
			service.children = service.children.map(function (child) {
				return child.toObject();
			});
		}
		return service.toObject();
	});
};

ServiceSchema.methods.showPublic = function showPublic() {
	return this.populateChildren().then(function (service) {
		if (service.children) {
			service.children = service.children.map(function (child) {
				return child.toPublicObject();
			});
		}
		return service.toPublicObject();
	});
};

/**
 * Assumes that the service consists of ancestors and one layer of children or
 * @instance
 * @method
 * @return {[type]} [description]
 */
ServiceSchema.methods.toPublicObject = function toPublicObject() {
	return ServiceSchema.statics.Publify(this.toObject());
};

/**
 * Takes a POJO Service and removes sensitive information.
 * @static@method
 * @param  {[type]} service [description]
 * @return {[type]}         [description]
 */
ServiceSchema.statics.Publify = function Publify (service) {
	if (service.parent) {
		service.parent = ServiceSchema.statics.Publify(service.parent);
	}
	if (service.admins) {
		delete service.admins;
	}
	return service;
};

/**
 * Attaches this Service's children -- sub-services or offers, if any -- and returns itself as a promise.
 */
ServiceSchema.methods.populateChildren = function populateChildren(admin) {
	var service = this;
	if (this.type === 'category') {
		var query = {
			parent: this._id
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
			service: this._id
		};
		if (!admin) {
			query.status = 'public';
		}
		return mongoose.model('Offer').findAsync(query).then(function (offers) {
			return Promise.map(offers, function (offer) {
				return offer.populateAsync('provider', 'name id');
			}).then(function (offers){
				service.offers = offers;
				return service;
			});
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

ServiceSchema.methods.canDelete = function canDelete () {
	return this.type === 'service' && this.offers.length === 0 || this.type === 'category' && this.children.length === 0;
};

// Requires populateAncestors first
ServiceSchema.methods.hasAncestor = function hasAncestor(ancestor) {
	if (!this.parent) return false;
	if (this.parent._id === (ancestor._id || ancestor)) {
		return true
	}
	return this.parent.hasAncestor(ancestor);
};


var ServiceModel = mongoose.model('Service', ServiceSchema);

Promise.promisifyAll(ServiceModel);
Promise.promisifyAll(ServiceModel.prototype);

module.exports = ServiceModel;