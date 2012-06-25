/**
 * api.js: provides RESTful api for the manager
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var express = require('express'),
mongoose = require('mongoose'),
mongooseAuth = require('mongoose-auth'),
psm = require('../psm');

var Api = exports.Api = function(manager) {
    var self = this;

    self._manager = manager;
    //self._psm = psm;    
    self._isRunning = false;

    self._configureServer();
    self._setupRoutes();
};

Api.prototype.startup = function(cb) {
    var self = this;

    try {
	psm.log.debug('API Listening to ' + 
		      psm.config.api.host + ':' +
		      psm.config.api.port);
	self._web.listen(psm.config.api.port, psm.config.api.host);
        self._isRunning = true;
	if(cb) cb(null);
    } catch(e) {
        psm.log.error('Error starting API Service.', e);
	if(cb) cb(e);
    }
};

Api.prototype.shutdown = function() {
    var self = this;

    psm.log.silly('Attempting to shutdown API.');
    if(self._isRunning) {
	psm.log.debug('Shuttind down API.');
	self._web.close();
	self._isRunning = false;
    }
};

Api.prototype._configureServer = function() {
    var self = this,
    User = mongoose.model('User');

    self._web = express.createServer();
    self._web.on('error', function(err) {
	psm.log.error('Error with API service.', err);
    });

    psm.log.silly('Configuring server.');
    self._web.configure(function() {
        self._web.use(express.bodyParser());
	self._web.use(express.cookieParser());
	self._web.use(express.session({ secret: psm.config.api.cookieSecret }));
	self._web.use(express.methodOverride());
	self._web.use(mongooseAuth.middleware());
    });

    mongooseAuth.helpExpress(self._web);
};

Api.prototype._setupRoutes = function() {
    var self = this;

    //Allow cross domain requests (for ajax calls)
    self._web.get('/*', function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Method', 'POST, GET, PUT, OPTIONS');
        res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
	
	psm.log.silly('Incoming request...');
        next();
    });

    //Basic Commands
    self._web.get('/:cmd(start|stop|restart|status)/:server/:remote?', function(req, res) {
	var cmd = req.params.cmd,
	server = req.params.server,
	remote = req.params.remote;

	psm.log.debug('Got command: %s, for server: %s, for remote: %s', cmd, server, remote);

	self._manager[cmd](server, remote, function(err) {
	    //if(err) psm.log.error(err, 'Error executing command: %s', cmd);

	    res.json({ success: !err, error: (err ? err.message : null) });
	});
    });

    //List servers
    self._web.get('/list/:remote?', function(req, res) {
	var remote = req.params.remote;

	psm.log.debug('Got list request, for remote: %s', remote);

	self._manager.list(remote, function(err, servers) {
	    //if(err) psm.log.error(err, 'Error getting servers for remote %s', remote);

	    res.json({ success: !err, error: (err ? err.message : null), servers: servers });
	});
    });

    //Add
    self._web.put('/:cmd(add|rm)/:type(server|remote)/:remote?', function(req, res) {
	var cmd = req.params.cmd,
	type = req.params.type,
	remote = req.params.remote,
	body;

	if(typeof(req.body) == 'string') {
	    try { body = JSON.parse(req.body); }
	    catch(e) {
		psm.log.error(e, 'Bad JSON given from worker %s', server);
		res.json({ success: false, error: e.message });
		return;
	    }
	} else body = req.body;
	
	psm.log.debug(body, 'Got request to %s %s, for remote %s', cmd, type, remote);

	res.json({ success: false, error: 'Not yet implemented' });
    });

    //Worker Communications
    self._web.get('/worker/ready/:server', function(req, res) {
	psm.log.debug('Got worker ready request for %s', req.params.server);

	self._manager.workerReady(req.params.server, function(err) {
	    if(err) psm.log.error(err, 'Error readying worker for %s', req.params.server);

	    res.json({ success: !err, error: (err ? err.message : null) });
	});
    });

    self._web.post('/worker/error/:server', function(req, res) {
	var body;

	if(typeof(req.body) == 'string') {
	    try { body = JSON.parse(req.body); }
	    catch(e) {
		psm.log.error(e, 'Bad JSON given from worker %s', req.params.server);
		res.json({ success: false, error: e.message });
		return;
	    }
	} else body = req.body;

	psm.log.debug(body, 'Got worker error request for %s', req.params.server);

	self._manager.workerError(req.params.server, req.body, function(err) {
	    if(err) psm.log.silly(err, 'Error parsing worker error for %s', req.params.server);

	    res.json({ success: !err, error: (err ? err.message : null) });
	});
    });

    self._web.get('/worker/settings/:server', function(req, res) {
	psm.log.debug('Got worker settings request for %s', req.params.server);
	
	self._manager.workerSettings(req.params.server, function(err, settings) {
	    if(err) psm.log.error(err, 'Error getting worker settings for %s', req.params.server);

	    res.json({ success: !err, error: (err ? err.message : null), settings: settings });
	});
    });
};