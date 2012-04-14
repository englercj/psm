/**
 * Panther Server Manager API
 **/

var log = require('./logger').log,
utils = require('./utils'),
config = require('../config/config.json'),
express = require('express'),
util = require('util'),
events = require('events'),
path = require('path');

var Api = exports.Api = function(psm) {
    events.EventEmitter.call(this);
    var self = this;

    self._psm = psm;

    self._web = express.createServer();
    self._configureServer();
    self._setupRoutes();

    self.start = function() {
	self._web.listen(config.api.port, config.api.host);
    };
};

//inherits from event emitter
util.inherits(Api, events.EventEmitter);

Api.prototype._configureServer = function() {
    var self = this;
    self._web.configure(function() {
	self._web.use(express.bodyParser());
    });
};

Api.prototype._setupRoutes = function() {
    var self = this;

    ///////////////
    //Games
    ///////////////
    self._web.get('/games/:cmd?', function(req, res) {
	var cmd = (req.params.cmd ? req.params.cmd : 'status');

	if(cmd == 'status') {
	    var srvs = self._psm.settings.servers,
	    ret = {
		info: 'Got statuses from the servers',
		data: {}
	    };

	    for(var srv in srvs) {
		if(srvs.hasOwnProperty(srv)) {
		    ret.data[srv] = {
			name: srvs[srv].name,
			aliases: srvs[srv].aliases,
			status: self._psm.cmd([srv, cmd], false)
		    };
		}
	    }
	    res.json(ret);
	} else if(cmd == 'add') {
	    res.json({ error: 'Try posting the add info instead' });
	    return;
	} else {
	    self._psm.once('cmd::done', function(data) {
		res.json({ info: 'Command sent to the server successfully', data: data });
	    });

	    self._psm.cmdAll(cmd);
	}
    });

    self._web.post('/games/add', function(req, res) {
	res.json({ error: 'Method not implemented yet' });
	return;

	var cmd = req.params.cmd,
	args = req.body;

	if(args) {
	    self._psm.once('cmd::done', function(data) {
		res.json({ info: 'Command sent to the server successfully', data: data });
	    });

	    args.splice(0, 0, game, cmd);
	    self._psm.cmd(args);
	} else {
	    res.json({ error: 'Bad args posted' });
	}
    });

    ///////////////
    //Game
    ///////////////
    self._web.get('/game/:game/:cmd?', function(req, res) {
	var game = req.params.game,
	cmd = (req.params.cmd ? req.params.cmd : 'status');

	self._psm.once('cmd::done', function(data) {
	    res.json({ info: 'Command sent to sever successfully', data: data });
	});

	self._psm.cmd([game, cmd]);
    });

    self._web.post('/game/:game/:cmd', function(req, res) {
	var game = req.params.game,
	cmd = req.params.cmd,
	args = req.body;

	self._psm.once('cmd::done', function(data) {
	    res.json({ info: '', data: data });
	});

	args = self._objToArray(args);

	args.splice(0, 0, game, cmd);

	self._psm.cmd(args);
    });

    ///////////////
    //404 Error
    ///////////////
    self._web.get('*', function(req, res) {
	res.json({ error: 'bad request' }, 404);
    });
};

Api.prototype._objToArray = function(obj) {
    var res = [];

    for(var i in obj) {
	if(obj.hasOwnProperty(i)) {
	    res.push(obj[i]);
	}
    }

    return res;
};