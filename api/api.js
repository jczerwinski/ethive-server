'use strict';

module.exports.login = require('./login.js');

module.exports.services = {};
/**
 * Gives an array of all available top level services with its children attached.
 * @public
 */
module.exports.services.index = function * () {
	var index = [];
	services.forEach(function (service)  {
		// For top level services - ie. those without parents
		if (!service.parent) {
			// Add to our list.
			service = cloneService(service);
			index.push(service);
			// Also attach its children
			var children = getChildren(service);
			service.children = children;
		}
	});
	this.body = yield index;
};

/**
 * @api {get} /api/services/:id Get Service by ID
 * @apiName GetService
 * Gives a Service object literal with its children attached.
 */
module.exports.services.show = function * () {
	var service = cloneService(servicesHash[this.params.id]);
	// Get children
	service.children = getChildren(service);
	service.offers = offersHash[service.id];
	this.body = yield service;
};

function cloneService (service) {
	return {
		name: service.name,
		id: service.id,
		parent: service.parent,
		description: service.description,
		children: service.children
	}
}

function getChildren (service) {
	var children = [];
	if (Array.isArray(service.children)) {
		service.children.forEach(function (childID) {
			children.push(servicesHash[childID]);
		});
	} else {
		children = undefined;
	}
	return children;
}

var services =	[
	{
		name: 'Orthopedic Surgery',
		id: 'orthopedic-surgery',
		children: [
			'orthopedic-shoulder-surgery',
			'orthopedic-upper-arm-surgery',
			'orthopedic-hand-surgery',
			'orthopedic-wrist-surgery',
			'orthopedic-forearm-surgery',
			'orthopedic-elbow-surgery',
			'orthopedic-hip-surgery',
			'orthopedic-upper-leg-surgery',
			'orthopedic-knee-surgery',
			'orthopedic-lower-leg-surgery',
			'orthopedic-ankle-surgery',
			'orthopedic-foot-surgery'
		]
	},
	{
		name: 'Orthopedic Shoulder Surgery',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-shoulder-surgery',
		description: 'Orthopedic shoulder surgery services.'
	},
	{
		name: 'Orthopedic Upper Arm Surgery',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-upper-arm-surgery',
		description: 'Orthopedic upper arm surgery services.'
	},
	{
		name: 'Orthopedic Hand Surgery',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-hand-surgery'
	},
	{
		name: 'Orthopedic Wrist Surgery',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-wrist-surgery'
	},
	{
		name: 'Orthopedic Forearm Surgery',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-forearm-surgery'
	},
	{
		name: 'Elbow',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-elbow-surgery'
	},
	{
		name: 'Hip',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-hip-surgery'
	},
	{
		name: 'Upper Leg',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-upper-leg-surgery'
	},
	{
		name: 'Knee',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-knee-surgery'
	},
	{
		name: 'Lower Leg',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-lower-leg-surgery'
	},
	{
		name: 'Ankle',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-ankle-surgery'
	},
	{
		name: 'Foot',
		parent: 'orthopedic-surgery',
		id: 'orthopedic-foot-surgery'
	}
];

// Build services hash. Hashed by service ID. 
var servicesHash = {};
services.forEach(function (service) {
	servicesHash[service.id] = service;
});

var providers = [
	{
		name: "Dr. Jamie Czerwinski",
		id: "jczerwinski",
		offers: [
			{
				id: 1,
				service: {
					id: 'orthopedic-hand-surgery'
				},
				price: {
					amount: 10,
					currency: 'CAD',
				},
				locationsOffered: [],
				performedBy: [],
				valid: {
					start: null,
					end: null,
				},
				status: null// active, 
			}
		]
	}
];
// Build offers hashed by service id.
var offersHash = {};
populateOffersHash(providers);


function populateOffersHash (providers) {
	providers.forEach(function (provider) {
		provider.offers.forEach(function (offer) {
			offer.provider = {};
			offer.provider.name = provider.name;
			offer.provider.id = provider.id;
			if (!Array.isArray(offersHash[offer.service.id])) {
				offersHash[offer.service.id] = [];
			}
			offer.service.name = servicesHash[offer.service.id].name;
			offersHash[offer.service.id].push(offer);
		});
	});
}

var providersHash = {};
populateProvidersHash(providers);

function populateProvidersHash (providers) {
	providers.forEach(function (provider) {
		providersHash[provider.id] = provider;
	});
}

module.exports.providers = {};
module.exports.providers.show = function * () {
	var provider = providersHash[this.params.id];
	if (provider) {
		this.body = yield provider;
	} else {
		this.throw(404);
	}
};

module.exports.providers.offers = {};
module.exports.providers.offers.show = function *() {
	var provider = providersHash[this.params.providerID];
	if (!provider) {
		this.throw('Cannot find provider', 404);
	}
	var offer = provider.offers.find(function (offer) {
		return offer.id == this.params.offerID;
	}, this);
	if (!offer) {
		this.throw(404);
	}
	this.body = yield offer;
};