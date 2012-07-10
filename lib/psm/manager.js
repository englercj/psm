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
Worker = require('./worker').Worker,
Api = require('./api').Api,
psm = require('../psm');

var Manager = exports.Manager = function(options) {
    var self = this;

    options.verbose = true;

    Hook.call(self, options);

    self._workerScript = path.join(__dirname, 'worker.js');

    self._servers = {};
    self._config = {};
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

Manager.prototype.restart = function(server, cb) {
    this._workerCmd('restart', server, cb);
};

Manager.prototype.status = function(server, cb) {
    this._workerCmd('status', server, cb);
};

Manager.prototype.cmd = function(cmd, server, cb) {
    this._workerCmd('cmd', server, { cmd: cmd }, cb);
};

Manager.prototype.update = function(server, cb) {
    this._workerCmd('update', server, cb);
};

Manager.prototype.backupServer = function(server, cb) {
    this._workerCmd('backupServer', server, cb);
};

Manager.prototype.backupMaps = function(server, cb) {
    this._workerCmd('backupMaps', server, cb);
};

Manager.prototype.backupLogs = function(server, cb) {
    this._workerCmd('backupLogs', server, cb);
};

Manager.prototype.reloadConfig = function(server, cb) {
    this._workerCmd('reloadConfig', server, cb);
};

Manager.prototype.isRunning = function(server, cb) {
    this._workerCmd('isRunning', server, cb);
};

Manager.prototype.list = function(cb) {
    var self = this;

    utile.each(self._servers, function(server, sid) {
        server.running = (self._workers[sid] !== undefined);
    });
    
    if(cb) cb(null, self._servers);
};

Manager.prototype.serverAdd = function(server, cb) {
    var self = this;

    //TODO: Server add
    if(cb) cb(new Error('Server adding is not implemented yet.'));
};

Manager.prototype.serverRm = function(server, cb) {
    var self = this;

    if(self._workers[server]) {
        if(cb) cb(new Error('This server is running, please shut it down before removing it'));
    } else {
        psm.log.debug('Deleting server from memory list');

        delete self._servers[server];
        self._storeServers();

        if(cb) cb();
    }
};

//little backwards on the params due to the proxy method
Manager.prototype.workerReady = function(server, cb) {
    var self = this;

    psm.log.silly('Removing spawn error listener for worker hook.');
    self.removeListener('hook::spawn::error', self._workers[server].onError);

    psm.log.debug('Worker hook ready, starting up...');
    self._workerCmd('startup', server, null, self._servers[server], function() {
	self._workers[server].ready = true;
	if(cb) cb();
    });
};

//little backwards on the params due to the proxy method
Manager.prototype.workerError = function(server, cb, err) {
    var self = this;

    psm.log.error(err, 'Error from worker process!');
    self._workers[server] = null;

    if(cb) cb(err);
};

Manager.prototype._workerCmd = function(fn, server, data, cb) {
    var self = this;

    if(typeof(data) == 'function') {
	cb = data;
	data = null;
    }
    
    if(!self._workers[server]) {
        if(cb) cb(new Error('No worker process started for server "' + server + '"'));
    } else {
	data = (data ? JSON.stringify(data) : data);

	self.emit('action::' + server + '::' + fn, JSON.stringify(data), cb);
    }
};

Manager.prototype._setupWorkerListeners = function() {
    self.on('*::event::output', function(data) {

    });

    self.on('*::event::player::connect', function(data) {

    });

    self.on('*::event::player::disconnect', function(data) {

    });

    self.on('*::event::player::chat', function(data) {
	
    });

    self.on('*::event::mcwarn', function(data) {
	
    });

    self.on('*::event::mcerror', function(data) {
	
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
	    onError: psm.proxy(self.workerError, self, server, cb),
	    onReady: psm.proxy(self.workerReady, self, server, cb)
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