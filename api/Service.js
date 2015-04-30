var ServiceModel = require('../models/Service.js');

/**
 * Services comprise a forest. API Output is always in the form:
 *
 *   {
 *     // attributes
 *     parent: {} // Full blown service, all the way up to the root.
 *     children: {} // Full blown service, but only direct descendents.
 *   }
 *
 * The only exception is index(), which returns an array of all such services that have no parents.
 */
var Service = {};
module.exports = Service;

/**
 * Gives an array of all root-level services.
 * @public
 */
Service.index = function * (next) {
	// Get top level services viewable by the user
	this.body = yield ServiceModel.index(this.user);
	this.status = 200;
	yield next;
};

/**
 * @api {get} /api/services/:id Get Service by ID
 * @apiName GetService
 * Gives a Service object literal with its children and ancestors attached.
 */
Service.show = function * (next) {
	var service = yield ServiceModel.findOneAsync({
		id: this.params.id
	});
	if (!service) {
		// No such service
		this.status = 404;
	} else {
		// Found a service!
		this.body = yield service.show(this.user);
		this.status = this.body ? 200 : 404;
	}
	yield next;
};

Service.create = function * (next) {
	var service = yield ServiceModel.findOneAsync({
		id: this.req.body.id
	});
	if (service) {
		// Do not overwrite
		this.status = 403;
	} else {
		// Create
		// Prep document
		var service = this.req.body;
		service.parent = yield ServiceModel.TranslateId(service.parentId);
		service.admins = [this.user._id];
		service = new ServiceModel(service);
		yield service.populateAncestors();
		if (service.isAdministeredBy(this.user)) {
			// TODO still need to validate parent field, admins?
			service = yield service.saveAsync();
			this.status = 200;
		} else {
			// Not authorized
			this.status = 403;
		}
	}
	yield next;
};


Service.save = function * (next) {
	var response = this;
	var service = yield ServiceModel.findOneAsync({
		id: this.params.id
	});
	if (service) {
		// If the service exists, update it.
		yield service.populateAncestors();
		if (service.isAdministeredBy(this.user)) {
			// Authorized to save
			// Prep updates
			var updates = this.req.body;
			updates.parent = yield ServiceModel.TranslateId(updates.parent);
			service.set(updates);
			yield service.saveAsync().then(function(res) {
				var product = res[0];
				var changed = res[1];
				// 200 OK if change successful. Something other than valaidation went wrong if not.
				response.status = changed ? 200 : 500;
			}).catch(function(err) {
				// Validation error
				response.status = 400;
				response.body = err;
			});
			yield next;
		} else {
			// Unauthorized
			this.status = 403;
			yield next;
		}
	} else {
		// Service wasn't found. 404!
		this.status = 404;
	}
	yield next;
};