/**
 * api.js: provides RESTful api for the manager
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var express = require('express'),
os = require('os'),
//sio = require('socket.io'),
//mongoose = require('mongoose'),
//mongooseAuth = require('mongoose-auth'),
psm = require('../psm');

var Api = exports.Api = function(manager) {
    var self = this;

    self._manager = manager;
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
    var self = this;
    //User = mongoose.model('User');

    self._web = express.createServer();
    self._web.on('error', function(err) {
        psm.log.error('Error with API service.', err);
    });

    //self._io = sio.listen(self._web);

    psm.log.silly('Configuring server.');
    self._web.configure(function() {
        self._web.use(express.bodyParser());
        //self._web.use(express.cookieParser());
        //self._web.use(express.session({ secret: psm.config.api.cookieSecret }));
        //self._web.use(express.methodOverride());
        //self._web.use(mongooseAuth.middleware());
    });

    //mongooseAuth.helpExpress(self._web);
};

Api.prototype._setupRoutes = function() {
    var self = this;

    //Allow cross domain requests (for ajax calls)
    self._web.get('/*', function(req, res, next) {
        //res.header('Access-Control-Allow-Origin', '*');
        //res.header('Access-Control-Allow-Method', 'POST, GET, PUT, OPTIONS');
        //res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);

        psm.log.silly('Incoming request...');
        if(req.query.token == psm.config.token)
            next();
        else
            res.json({ success: false, error: 'Invalid auth token' });
    });

    //Basic Commands
    self._web.get('/:cmd(start|stop|restart|status|update|backupServer|backupMaps|backupLogs|reloadConfig|isRunning)/:server/:remote?', function(req, res) {
        var cmd = req.params.cmd,
        server = req.params.server,
        remote = req.params.remote;

        psm.log.debug('Got command: %s, for server: %s, for remote: %s', cmd, server, remote);

	if(cmd == 'start') cmd = 'startServer';

        self._manager[cmd](server, remote, function(err, data) {
            //if(err) psm.log.error(err, 'Error executing command: %s', cmd);

            res.json({ success: !err, error: (err ? err.message : null), data: data });
        });
    });

    //actual command to server
    self._web.post('/cmd/:server/:remote?', function(req, res) {
	psm.log.debug(req.body, 'Got command for server: %s, for remote: %s', req.params.server, req.params.remote);

	self._manager.cmd(req.body.cmd, req.params.server, req.params.remote, function(err, data) {
	    res.json({ success: !err, error: (err ? err.message : null), data: data });
	});
    });

    //Daemon Status
    self._web.get('/system/status', function(req, res) {
        res.json({
            success: true,
            status: {
                hostname: os.hostname(),
                type: os.type(),
                arch: os.arch(),
                loadavg: os.loadavg(),
                freemem: os.freemem(),
                totalmem: os.totalmem(),
                cpus: os.cpus()
            }
        });
    });

    //Get Configuration
    self._web.get('/config/:key', function(req, res) {
        psm.log.debug('Got config request, key: %s', req.params.key);

        var levels = req.params.key.split('.'),
        opt = psm.config,
        i = levels.length - 1,
        key;

        while (i--) opt = opt[levels.shift()];
        key = levels.shift();

        res.json({ success: true, value: opt[key] });
    });

    //Update Configuration
    self._web.post('/config/:key', function(req, res) {
        psm.log.debug('Got config request, key: %s', req.params.key);

        var levels = req.params.key.split('.'),
        opt = psm.config,
        i = levels.length - 1,
        body, key;

        while (i--) opt = opt[levels.shift()];
        key = levels.shift();

        try {
            body = JSON.parse(req.body);
        } catch(e) {
            res.json({ success: false, error: e.message });
            return;
        }

        opt[key] = body;

        res.json({ success: true, value: opt[key] });

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
    self._web.post('/:cmd(add|rm)/:type(server|remote)/:remote?', function(req, res) {
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
    /*
    self._web.get('/worker/ready/:server', function(req, res) {
        psm.log.debug('Got worker ready request for %s', req.params.server);

        self._manager.workerReady(req.params.server, function(err) {
            if(err) psm.log.error(err, 'Error readying worker for %s', req.params.server);

            res.json({ success: !err, error: (err ? err.message : null) });
        });
    });

    self._web.post('/worker/error/:server', function(req, res) {
        psm.log.debug(req.body, 'Got worker error request for %s', req.params.server);

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

    self._web.post('/worker/message/:server', function(req, res) {
	psm.log.silly(req.body, 'Got worker message for %s', req.params.server);

	self._io.sockets.emit(req.body.channel, req.body.message);

	res.json({ success: true });
    });
    */
};