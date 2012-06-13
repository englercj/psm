/**
 * api.js: provides RESTful api for the manager
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var express = require('express'),
mongoose = require('mongoose'),
mongooseAuth = require('mongoose-auth');

var Api = exports.Api = function(psm, manager) {
    var self = this;

    self._manager = manager;
    self._psm = psm;    
    self._isRunning = false;

    self._configureServer();
    self._setupRoutes();
};

Api.prototype.startup = function(cb) {
    var self = this;

    try {
	self._psm.log.debug('Starting API server. Listening to ' + 
			    self._psm.config.api.host + ':' +
			    self._psm.config.api.port);
	self._web.listen(self._psm.config.api.port, self._psm.config.api.host);
        self._isRunning = true;
	if(cb) cb(null);
    } catch(e) {
        self._psm.log.error('Error starting API Service.', e);
	if(cb) cb(e);
    }
};

Api.prototype.shutdown = function() {
    var self = this;

    self._psm.log.silly('Attempting to shutdown API.');
    if(self._isRunning) {
	self._psm.log.debug('Shuttind down API.');
	self._web.close();
	self._isRunning = false;
    }
};

Api.prototype._configureServer = function() {
    var self = this,
    User = mongoose.model('User');

    self._web = express.createServer();
    self._web.on('error', function(err) {
	self._psm.log.error('Error with API service.', err);
    });

    self._psm.log.silly('Configuring server.');
    self._web.configure(function() {
        self._web.use(express.bodyParser());
	self._web.use(express.cookieParser());
	self._web.use(express.session({ secret: self._psm.config.cookieSecret }));
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
	
	//ensure a valid token
	if(!req.query.token || req.query.token != self._manager._token)
	    res.json({ error: new Error('Bad Token') }, 403);
	else
            next();
    });

    //Basic Commands
    self._web.get('/:cmd(start|stop|restart|status)/:server/:remote?', function(req, res) {
	var cmd = req.params.cmd,
	server = req.params.server,
	remote = req.params.remote;
    });

    //List servers
    self._web.get('/list/:remote?', function(req, res) {
	var remote = req.params.remote;
    });

    //Add
    self._web.put('/:cmd(add|rm)/:type(server|remote)/:remote?', function(req, res) {
	var cmd = req.params.cmd,
	type = req.params.type,
	remote = req.params.remote,
	server = req.body;
	
    });

    //Worker Communications
    self._web.get('/worker/ready/:server', function(req, res) {
	self._manager.workerReady(req.params.server, function(err) {
	    if(err) res.json({ success: false, error: err });
	    else res.json({ success: true });
	});
    });

    self._web.post('/worker/error/:server', function(req, res) {
	self._manager.workerError(req.params.server, req.body, function(err) {
	    if(err) res.json({ success: false, error: err });
	    else res.json({ success: true });
	});
    });

    self._web.get('/worker/settings/:server', function(req, res) {
	self._manager.workerSettings(req.params.server, function(err, settings) {
	    if(err) res.json({ success: false, error: err });
	    else res.json({ success: true, settings: settings });
	});
    });
};