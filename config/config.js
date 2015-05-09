var nconf = module.exports = require('nconf');

//nconf.argv().env();

if (nconf.get('NODE_ENV') === 'production') {
} else if (nconf.get('NODE_ENV') === 'staging') {
} else {
	// Development
	nconf.add('literal', require('./development.json'));
}

// No need to check if admins is array :)
nconf.defaults({
	admins: []
});