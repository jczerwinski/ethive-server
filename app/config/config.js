var extend = require('extend');

var config = module.exports = {};

if (process.env.NODE_ENV === 'production') {
	extend(config, require('./production.json'));
	config.servers.api.port = process.env.PORT || config.servers.api.port;
	// jwtSecret must be set at command line or environment variable in production and staging, at least once there are more people working on it
	/*if (nconf.get('jwtSecret') === undefined) {
		throw new Error('jwtSecret must be provided as a command line argument or environment variable');
	}*/
	if (process.env.ETHIVE_ADMINS) {
		config.admins = JSON.parse(process.env.ETHIVE_ADMINS);
	}
} else {
	extend(config, require('./development.json'));
	try {
		extend(config, require('./locals.json'));
	} catch (err) {
		// No norries m8!
	}
}

config.admins = config.admins || [];