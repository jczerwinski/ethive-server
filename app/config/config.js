var nconf = module.exports = require('nconf');

nconf.argv().env();

if (nconf.get('NODE_ENV') === 'production') {
	nconf.add('literal', require('./production.json'));
	// jwtSecret must be set at command line or environment variable in production and staging, at least once there are more people working on it
	/*if (nconf.get('jwtSecret') === undefined) {
		throw new Error('jwtSecret must be provided as a command line argument or environment variable');
	}*/
} else if (nconf.get('NODE_ENV') === 'staging') {
} else {
	// Development
	nconf.add('literal', require('./development.json'));
}

// No need to check if admins is array :)
nconf.defaults({
	ethive_admins: []
});