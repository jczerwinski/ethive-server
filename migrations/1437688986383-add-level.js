'use strict'

var mongo = require('mongodb').MongoClient;
var url = require('../app/lib/servers.js').mongo;
var async = require('async');

function getLevelFromPath (path) {
	return path ? path.split('#').length : 0;
}

exports.up = function(next) {
	mongo.connect(url, function (err, db) {
		if (err) throw err;

		var done = false;

		var q = async.queue(function (service, callback) {
			return Services.save(service, {w:0}, callback);
		}, Infinity);

		q.drain = function () {
			if (done) next();
		};

		var Services = db.collection('services');
		var services = Services.find();

		services.forEach(function (service) {
			service.level = getLevelFromPath(service.path);
			q.push(service);
		}, function (err) {
			if (err) throw err;
			done = true;
		});
	});
};

exports.down = function(next) {
	mongo.connect(url, function (err, db) {
		if (err) throw err;

		var Services = db.collection('services');

		Services.update({},{
			$unset: {
				level: ''
			}
		}, {
			writeConcern: {
				w: 0
			},
			multi: true
		}, next);
	});
};
