/**
 * manager.js: manages local workers
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var path = require('path'),
Hook = require('hook.io').Hook,
fs = require('fs'),
mongoose = require('mongoose'),
utile = require('utile'),
//Worker = require('../worker/worker').Worker,
Api = require('./api').Api,
psm = require('../../psm');

var Manager = exports.Manager = function(options) {
    var self = this;

    options.verbose = true;

    Hook.call(self, options);

    self._workerScript = path.join(__dirname, '..', 'worker', 'worker.js');
    self._reservedServerNames = [
	'server', 'config', 'system'
    ];

    self._servers = {};
    self._workers = {};
};

utile.inherits(Manager, Hook);

Manager.prototype.startup = function(cb) {
    var self = this;

    //load servers from MongoDB
    self._loadServers(function(err) {
        //start RESTful API server
        self._startApi(function(err) {
            if(err) { if(cb) cb(err); return; }

            psm.log.silly('API started!');
            //startup completed
            if(cb) cb(null);
        });
    });
};

//isn't named 'start' because that would shadow the
//base Hook.start() function
Manager.prototype.startServer = function(server, cb) {
    var self = this;

    self._startWorker(server, function(err) {
	console.log('WORKER STARTED', err);
	if(err) { if(cb) cb(err); return; }

	self._workerCmd('start', server, cb);
    });
};

Manager.prototype.stop = function(server, cb) {
    var self = this;

    self._workerCmd('stop', server, function() {
        self.kill(server, function() {
            self._workers[server] = null;
            if(cb) cb();
        });
    });
};

Manager.prototype.list = function(cb) {
    var self = this;

    utile.each(self._servers, function(server, sid) {
        server.running = !!self._workers[sid];
    });
    
    if(cb) cb(null, self._servers);
};

Manager.prototype.addServer = function(server, cb) {
    var self = this;

    if(self._reservedServerNames.indexOf(server.name) !== -1)
	cb(new Error(server.name + ' is a reserved name, please choose something else.'));
    else {
	self._servers[server.name] = server;
	self._storeServers(cb);
    }
};

Manager.prototype.rmServer = function(server, cb) {
    var self = this;

    if(self._workers[server]) {
        if(cb) cb(new Error('This server is running, please shut it down before removing it.'));
    } else {
        psm.log.debug('Deleting server from memory list');

        delete self._servers[server];
        self._storeServers();

        if(cb) cb();
    }
};

Manager.prototype._onWorkerReady = function(server, cb) {
    var self = this;

    psm.log.silly('Removing spawn error listener for worker hook.');
    self.removeListener('hook::spawn::error', self._workers[server].onError);

    psm.log.debug('Worker hook ready, starting up...');
    self._workerCmd('startup', server, self._servers[server], function() {
	self._workers[server].ready = true;
	if(cb) cb();
    });
};

//little backwards on the params due to the proxy method
Manager.prototype._onWorkerError = function(server, cb, err) {
    var self = this;

    psm.log.error(err, 'Error from worker process!');
    self._workers[server] = null;

    if(cb) cb(err);
};

Manager.prototype._workerCmd = function(server, method, man, args, cb) {
    var self = this;

    if(typeof(args) == 'function') {
	cb = args;
	args = [];
    }

    if(!self._workers[server]) {
        if(cb) cb(new Error('No worker process started for server "' + server + '"'));
    } else {
	self.emit('action::' + server, {
	    method: method,
	    man: man,
	    args: args
	}, cb);
    }
};

Manager.prototype._setupWorkerListeners = function() {
    self.on('*::event::output', function(data) {
	self._api._io.sockets.emit('output', data);
    });

    self.on('*::event::player::connect', function(data) {
	self._api._io.sockets.emit('player::connect', data);
    });

    self.on('*::event::player::disconnect', function(data) {
	self._api._io.sockets.emit('player::disconnect', data);
    });

    self.on('*::event::player::chat', function(data) {
	self._api._io.sockets.emit('player::chat', data);
    });

    self.on('*::event::mcwarn', function(data) {
	self._api._io.sockets.emit('mcwarn', data);
    });

    self.on('*::event::mcerror', function(data) {
	self._api._io.sockets.emit('mcerror', data);
    });
};

Manager.prototype._startApi = function(cb) {
    var self = this;

    psm.log.debug('Initializing API');
    self._api = new Api(self);

    psm.log.debug('Starting API');
    self._api.startup(cb);
};

Manager.prototype._loadServers = function(cb) {
    var self = this,
    Server = mongoose.model('Server');

    psm.log.debug('Loading servers from MongoDB.');
    Server.find({}, function(err, docs) {
        if(err) {
            psm.log.error(err, 'Unable to load servers from MongoDB.');
            if(cb) cb(err);
            return;
        }

        docs.forEach(function(doc) {
            psm.log.silly(doc._doc, 'Server loaded.');
            self._servers[doc._doc.name] = doc._doc;
        });

        if(cb) cb(null);
    });
};

Manager.prototype._storeServers = function(cb) {
    var self = this,
    Server = mongoose.model('Server'),
    done = 0,
    len = Object.keys(self._servers).length,
    errors = [];

    psm.log.debug('Storing servers currently loaded in memory');
    utile.each(self._servers, function(server, name) {
        psm.log.silly('Upserting server %s', name);
        Server.update({ name: name }, server, { upsert: true }, function(err) {
            if(err) errors.push(err);

            done++;
            if(done == len) {
                if(errors.length && cb) cb(errors);
                else if(cb) cb(null);
            }
        });
    });
};

Manager.prototype._startWorker = function(server, cb) {
    var self = this;

    if(self._workers[server]) {
        //Already started
        if(cb) cb();
    } else if(!self._servers[server]) {
	//Unknown server
	if(cb) cb(new Error('Unknown server "' + server + '", please add this server first'));
    } else {
        psm.log.silly('Setting up a new worker object');
        self._workers[server] = {
            server: server,
            ready: false,
            pidFile: psm.config.pids.worker.replace('$#', server),
	    onError: psm.proxy(self._onWorkerError, self, server, cb),
	    onReady: psm.proxy(self._onWorkerReady, self, server, cb)
        };
	
        psm.log.debug('Spawning worker hook');
	
	self.spawn({
	    name: server,
	    src: self._workerScript
	});
	
	self.once('hook::spawn::error', self._workers[server].onError);
	self.once('children::ready', self._workers[server].onReady);
    }
};