// Error handling middleware
module.exports = function * (next) {
	try {
		yield next;
	} catch (err) {
		this.status = 500;
		this.app.emit('error', err, this);
	}
};