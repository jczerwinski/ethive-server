'use strict'

var mongo = require('mongodb').MongoClient;
var url = require('../app/lib/servers.js').mongo;
var async = require('async');

function setPaths (Services, q, parent, done) {
	if (parent) {
		var services = Services.find({parent: parent._id});
	} else {
		var services = Services.find({parent: null});
	}

	services.forEach(function (service) {
		// Set path
		if (parent) {
			service.path = parent.path + '#' + service._id.toHexString();
		} else {
			service.path = service._id.toHexString();
		}
		q.push(service);
		setPaths(Services, q, service);
	}, function (err) {
		if (done) done();
	});
}

function clearPaths (Services) {
	var services = Services.find();
	services.forEach(function (service) {
		delete service.path;
		Services.save(service, {w:0, wtimeout:0});
	});
};

exports.up = function(next) {
	mongo.connect(url, function (err, db) {
		if (err) throw err;

		var Services = db.collection('services');
		var done = false;

		var q = async.queue(function (service, callback) {
			return Services.save(service, {w:0,wtimeout:0}, callback);
		}, Infinity);

		q.drain = function () {
			if (done) next();
		};

		setPaths(Services, q, null, function () {
			done = true;
		});
	});
};

exports.down = function(next) {
	mongo.connect(url, function (err, db) {
		if (err) throw err;
		var Services = db.collection('services')
		clearPaths(Services, next);
	});
};
