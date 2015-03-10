var router = require('koa-router')();

var auth = require('../lib/auth');

var User = require('./User');
var Service = require('./Service');
var Provider = require('./Provider');

module.exports = router;

router
    .post('/api/auth', auth)

// Services
.get('/api/services', Service.index)
    .get('/api/services/:id', Service.show)
    .post('/api/services', Service.create)
    .put('/api/services/:id', Service.save)

// Users
.get('/api/users', User.query)
    .get('/api/users/:username', User.show)
    .post('/api/users', User.save)
    .get('/api/verifyEmail/:emailVerificationKey', User.verifyEmail)

// Providers
.post('/api/providers', Provider.create)
    .get('/api/providers/:id', Provider.show)
    .get('/api/providers/:providerID/offers/:offerID', Provider.offers.show)
    .post('/api/providers/:providerID/offers', Provider.offers.create)

/**
 * @apiGroup Offers
 * @api {get} /offers/:id Get Offer
 * @apiName Get Offer
 * @apiDescription
 * Retrieve a single Offer by it's id.
 *
 * Aliased by /providers/:providerID/offers/:offerID
 *
 * Retreived Offers include their Provider and Service inlined to allow for their easy display and retrieval.
 *
 * @apiSuccessExample {json} Success-Response:
 *   // GET /offers/123
 *   200 OK
 *   {
 *     "id": 123,
 *     "provider": {},
 *     "service": {},
 *     "location": "Google Location, Location",
 *     "price": {
 *         "currency": "CAD",
 *         "amount": 1500
 *     }
 *   }
 */
.get('api/offers/:id', function* (next) { // TODO
    yield next;
});