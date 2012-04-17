/**
 * Panther Server Manager API
 **/

var utils = require('./utils'),
config = require('../config/config.json'),
express = require('express'),
util = require('util'),
events = require('events'),
path = require('path');

var Api = exports.Api = function(psm, logger) {
    events.EventEmitter.call(this);
    var self = this;

    self._psm = psm;
    self._logger = logger;
    self._isRunning = false;

    self._web = express.createServer();
    self._configureServer();
    self._setupRoutes();

    self._psm.on('cmd::done', function(data) {
	self.emit('api::handle', data);
    });
};

//inherits from event emitter
util.inherits(Api, events.EventEmitter);

Api.prototype.start = function() {
    this._web.listen(config.api.port, config.api.host);
    this._isRunning = true;
};

Api.prototype.stop = function() {
    this._web.close();
    this._isRunning = false;
};

Api.prototype.isRunning = function() {
    return this._isRunning;
};

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
	self._logger.log('Games command received, cmd: ' + cmd, 'debug');

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
	    self._logger.log('Generated status of servers', 'debug');
	    res.json(ret);
	} else if(cmd == 'add') {
	    res.json({ error: 'Try posting the add info instead' });
	    return;
	} else {
	    (function(res) {
		self.once('api::handle', function(data) {
		    res.json({ info: 'Command sent to the server successfully', data: data });
		});
	    })(res);
	    self._logger.log('Sending all command: ' + cmd, 'debug');
	    self._psm.cmdAll(cmd);
	}
    });

    self._web.post('/games/add', function(req, res) {
	res.json({ error: 'Method not implemented yet' });
	return;

	var cmd = req.params.cmd,
	args = req.body;

	if(args) {
	    (function(res) {
		self.once('api::handle', function(data) {
		    res.json({ info: 'Command sent to the server successfully', data: data });
		});
	    })(res);

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

	self._logger.log('Game command received, game: ' + game + ', cmd: ' + cmd, 'debug');

	(function(res) {
	    self.once('api::handle', function(data) {
		self._logger.log('Cmd done, data: ' + data, 'debug');
		var ret;
		if(data && !data.error)
		    ret = { info: 'Command sent to server successfully', data: data };
		else
		    ret = { error: (data ? data.error : 'Unkown Error'), data: false };

		res.json(ret);
	    });
	})(res);

	self._logger.log('Sending game cmd: ' + cmd, 'debug');
	self._psm.cmd([game, cmd]);
    });

    self._web.post('/game/:game/:cmd', function(req, res) {
	var game = req.params.game,
	cmd = req.params.cmd,
	args = req.body;

	self._logger.log('Game command post received, game: ' + game + ', cmd: ' + cmd + ', args: ', 'debug');
	self._logger.log(args, 'debug');

	(function(res, cb) {
	    cb = function(data) {
                self._logger.log('Cmd done, data: ' + data, 'debug');
                res.json({ info: '', data: data });
		self.removeListener('api::handle', cb);
            }
	    self.on('api::handle', cb);
	})(res);

	args = self._objToArray(args);

	args.splice(0, 0, game, cmd);

	self._logger.log('Sending game command with args: ', 'debug');
	self._logger.log(args);

	self._psm.cmd(args);
    });

    ///////////////
    //404 Error
    ///////////////
    self._web.get('*', function(req, res) {
	self._logger.log('Api got bad request', 'debug');
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