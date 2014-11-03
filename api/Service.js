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
	}).exec().then(function (services) {
		// Attach their children
		ctx.body = services.map(function (service) {
			service.getChildren().then(function (children) {
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
	var service = yield ServiceModel.findOneAsync({id: this.params.id});
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
};