/**
 * Panther Server Manager API
 **/

var log = require('./logger').log,
utils = require('./utils'),
config = require('../config/config.json'),
web = require('express').createServer(),
util = require('util'),
events = require('events'),
path = require('path');

var Api = exports.Api = function(psm) {
    events.EventEmitter.call(this);
    var self = this;

    self._configureServer();
    self._setupRoutes();

    self.start = function() {
	web.listen(config.api.port, config.api.host);
    };
};

//inherits from event emitter
util.inherits(Api, events.EventEmitter);

Api.prototype._configureServer = function() {
    web.use(express.bodyParer());
};

Api.prototype._setupRoutes = function() {
    web.get('/game/:game/:cmd?', function(req, res) {
	var game = req.params.game,
	cmd = (req.params.cmd ? req.params.cmd : 'status');

	psm.cmd([game, cmd]);
	
	psm.on('cmd::complete', function(data) {
	    res.json({ result: data });
	});
    });

    web.post('/game/:game/:cmd', function(req, res) {
	var game = req.params.game,
	cmd = req.params.cmd,
	args = (req.body.args ? req.body.args : []);

	if(args instanceof Array) {
	    args.splice(0, 0, game, cmd);
	    psm.cmd(args);
	    psm.on('cmd::complete', function(data) {
		res.json({ result: data });
	    });
	} else {
	    res.json({ error: 'bad args posted should be in { "args": [] } format' });
	}
    });

    web.get('*', function(req, res) {
	res.json({ error: 'bad request' }, 404);
    });
};