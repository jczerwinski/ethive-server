var config = require('konfig')();

// Expose server urls
var servers = module.exports = {};

// Parse servers config
for (var server in config.app.servers) {
	servers[server] = urlize(config.app.servers[server]);
}

/**
 * Server configuration blob
 * @typedef {Object} ServerConfig
 * @property {string} protocol
 * @property {string} domain
 * @property {string} path
 */

/**
 * Takes a {@link ServerConfig} and returns a url string representation.
 * @param  {ServerConfig} blob - Server config object blob
 * @return {string}       server url
 */
function urlize (blob) {
	var port = '';
	if (blob.port) {
		port = ':' + blob.port;
	}
	var path = blob.path || '';
	return blob.protocol + '://' + blob.domain + port + path;
}