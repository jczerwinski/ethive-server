var ServiceModel = require('../models/Service.js');
var Promise = require('bluebird');
var util = require ('../lib/util.js');
var sanitize = require('sanitize-object');
/**
 * Services comprise a forest. API Output is always in the form:
 *
 *   {
 *     // attributes
 *     parent: {} // Full blown service, all the way up to the root.
 *     children: {} // Full blown service, but only direct descendents.
 *   }
 *
 * The only exception is index(), which returns a flat array of all services without children or parents attached.
 */
var Service = {};
module.exports = Service;

/**
 * Gives an array of all root-level services.
 * @public
 */
Service.index = function * (next) {
	// If there's a query, do a search!
	if (this.query.search) {
		var query = {
			$text: {
				$search: this.query.search
			}
		};
		var sort = {
			score: {
				$meta: 'textScore'
			}
		};
		var services = yield ServiceModel.find(query, sort).sort(sort).limit(10).exec();
		this.body = yield ServiceModel.show(services, this.state.user);
		this.status = 200;
	} else {
		// Get top level services viewable by the user
		this.checkQuery('level').optional().isInt({min: 1});
		var query = sanitize('level')(this.query);
		this.body = yield ServiceModel.index(this.state.user, query);
		this.status = 200;
	}
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
		this.body = yield service.show(this.state.user);
		this.status = this.body ? 200 : 404;
	}
	yield next;
};

Service.create = function * (next) {
	var service = yield ServiceModel.findOneAsync({
		id: this.request.body.id
	});
	if (service) {
		// Do not overwrite
		this.status = 403;
	} else {
		// Create
		// Prep document
		service = this.request.body;
		service.parent = yield ServiceModel.GetById(service.parentId);
		delete service.parentId;
		service = new ServiceModel(service);
		if (service.parent) {
			yield service.parent.populateAncestors();
		}
		if (service.isAdministeredBy(this.state.user)) {
			service.admins = [this.state.user._id];
			yield service.saveAsync();
			this.status = 200;
			this.body = service;
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
		if (service.isAdministeredBy(this.state.user)) {
			// Authorized to save
			// Prep updates
			var updates = this.request.body;
			if (updates.parentId) {
				updates.parent = yield ServiceModel.GetById(updates.parentId);
			} else {
				updates.parent = null;
			}
			delete updates.parentId;
			service.set(updates);
			if (service.parent) {
				yield service.parent.populateAncestors();
			}
			if (service.isAdministeredBy(this.state.user)) {
				// Authorized with new parent
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
			}
		} else {
			// Unauthorized, but hide.
			this.status = 404;
		}
	} else {
		// Service wasn't found. 404!
		this.status = 404;
	}
	yield next;
};

Service.delete = function * (next) {
	var service = yield ServiceModel.findOneAsync({
		id: this.params.id
	});
	if (service) {
		yield service.populateAncestors();
		if (service.isAdministeredBy(this.state.user)) {
			yield service.populateChildren(true);
			if (service.canDelete()) {
				yield service.remove();
				this.status = 200;
			} else {
				this.status = 409;
			}
		} else {
			if (service.isPublished()) {
				if (this.state.user) {
					this.status = 403;
				} else {
					// Must log in
					this.status = 401;
				}
			} else {
				this.status = 404;
			}
		}
	} else {
		this.status = 404;
	}
	yield next;
};