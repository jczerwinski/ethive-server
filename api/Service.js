var ServiceModel = require('../models/Service.js');

var Service = {};
module.exports = Service;

/**
 * Gives an array of all available top level services with its children attached.
 * @public
 */
Service.index = function * (next) { // TODO Handle errors
	var ctx = this;
	// Get top level services
	ServiceModel.find({
		parent: undefined
	}).exec().then(function(services) {
		// Attach their children
		ctx.body = services.map(function(service) {
			service.getChildren().then(function(children) {
				service.children = children;
			});
			return service;
		});
	});
	yield next;
};

/**
 * @api {get} /api/services/:id Get Service by ID
 * @apiName GetService
 * Gives a Service object literal with its children and ancestors attached.
 */
Service.show = function * (next) { // TODO Handle errors.
	var service = yield ServiceModel.findOneAsync({
		_id: this.params.id
	});
	if (!service) {
		// No such service
		this.status = 404;
	} else {
		// Found a service!
		this.body = yield service.show(this.user);
		this.status = service ? 200 : 404;
	}
	yield next;
};

Service.create = function * (next) {
	// Create
	var service = new ServiceModel(this.req.body);
	yield service.populateAncestors();
	if (service.isAdministeredBy(this.user)) {
		// still need to validate parent field, admins?
		service = yield service.saveAsync();
		this.status = 200;
	} else {
		this.status = 403;
	}
	yield next;
};

Service.save = function * (next) {
	var service = yield ServiceModel.findOneAsync({
		_id: this.req.body._id
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
				// 200 OK if change successful. 404 Not Found if not.
				return changed ? 200 : 404;
			}).catch(function(err) {
				// 500 Server Error if... server error :) This will also include validation errors though
				return 500;
			});
			yield next;
		} else {
			// Unauthorized
			this.status = 403;
			yield next;
		}
	} else {
		// Create
		yield Service.create;
		yield next;
	}
};