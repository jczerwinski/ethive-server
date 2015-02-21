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
		_id: this.params.id
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
	// Create
	var service = new ServiceModel(this.req.body);
	yield service.populateAncestors();
	if (service.isAdministeredBy(this.user)) {
		// TODO still need to validate parent field, admins?
		service = yield service.saveAsync();
		this.status = 200;
	} else {
		this.status = 403;
	}
	yield next;
};

Service.save = function * (next) {
	var service = yield ServiceModel.findOneAsync({
		_id: this.params.id
	});
	if (service) {
		// If the service exists, update it.
		yield service.populateAncestors();
		if (service.isAdministeredBy(this.user)) {
			// Authorized. Let's do it.
			service.set(this.req.body);
			this.status = yield service.saveAsync().then(function(res) {
				var product = res[0];
				var changed = res[1];
				// 200 OK if change successful. Something other than valaidation went wrong if not.
				return changed ? 200 : 500;
			}).catch(function(err) {
				// Validation error
				return 400;
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