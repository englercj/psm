/**
 * manager.js: manages local workers and remote manager nodes
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var path = require('path'),
events = require('events'),
fs = require('fs'),
mongoose = require('mongoose'),
utile = require('utile'),
enode = require('enode'),
portfinder = require('portfinder'),
forever = require('forever'),
Api = require('./api').Api,
psm = require('../psm');

var Manager = exports.Manager = function() {
    var self = this;

    events.EventEmitter.call(self);

    self._servers = {};
    self._remotes = {};
    self._workers = {};

    process.on('exit', function() {
        try {
            fs.unlinkSync(psm.config.sockets.manager);
        } catch(e) {
            console.log(e);
        }
    });
};

utile.inherits(Manager, events.EventEmitter);

Manager.prototype.startup = function(cb) {
    var self = this;

    //silence psm console logger
    psm._console = null;

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

Manager.prototype.start = function(server, remote, cb) {
    var self = this;

    if(remote) {
        cb(new Error('Remotes not implemented yet.'));
    } else {
        if(self._workers[server]) {
            //Already started
            cb(new Error(server + ' is already running'));
        } else {
            self._workers[server] = {
                server: server,
                ready: false,
                pidFile: psm.config.pids.worker.replace('$#', server),
                socketFile: psm.config.sockets.worker.replace('$#', server),
            };

            forever.start(path.join(__dirname, 'worker.js'), {
                max: 1,
                silent: true,
                pidFile: worker.pidFile,
                options: [server, worker.socketFile, psm.config.api.port]
            });

            self.once('ready::' + server, function(err) {
		if(err) { cb(err); return; }

		self._workers[server].socket.start(function(err) {
                    cb(err);
		});
            });
        }
    }
};

Manager.prototype.stop = function(server, remote, cb) {
    var self = this;

    if(remote) {
        cb(new Error('Remotes not implemented yet.'));
    } else {
        var worker = self._workers[server];

        if(!worker) {
            cb(new Error('No worker process started for server "' + server + '"'));
        } else {
            worker.socket.stop(function(err) {
                self._workers[server] = worker = null;
                cb(null);
            });
        }
    }
};

Manager.prototype.restart = function(server, remote, cb) {
    var self = this;

    if(remote) {
        cb(new Error('Remotes not implemented yet.'));
    } else {
        var worker = self._workers[server];

        if(!worker) {
            cb(new Error('No worker process started for server "' + server + '"'));
        } else {
            worker.socket.restart(cb);
        }
    }
};

Manager.prototype.status = function(server, remote, cb) {
    var self = this;

    if(remote) {
        cb(new Error('Remotes not implemented yet.'));
    } else {
        var worker = self._workers[server];

        if(!worker) {
            cb(new Error('No worker process started for server "' + server + '"'));
        } else {
            worker.socket.status(cb);
        }
    }
};

Manager.prototype.list = function(remote, cb) {
    var self = this;

    if(remote) {
        cb(new Error('Remotes not implemented yet.'));
    } else {
        utile.each(self._servers, function(server, sid) {
            server.running = (self._worker[sid] !== undefined);
        });

        cb(null, self._servers);
    }
};

Manager.prototype.openStream = function(server, remote, cb) {
    var self = this;

    if(remote) {
        cb(new Error('Remotes not implemented yet.'));
    } else {
        var worker = self._workers[server];

        if(!worker) {
            cb(new Error('No worker process started for server "' + server + '"'));
        } else {
            worker.socket.openStream(cb);
        }
    }
};

Manager.prototype.serverAdd = function(server, remote, cb) {
    var self = this;

    if(remote) {
        cb(new Error('Remotes not implemented yet.'));
    } else {

    }
};

Manager.prototype.serverRm = function(server, remote, cb) {
    var self = this;

    if(remote) {
        cb(new Error('Remotes not implemented yet.'));
    } else {
        if(self._workers[server]) {
            cb(new Error('This server is running, please shut it down before removing it'));
        } else {
            delete self._servers[server];
            self._storeServers();
            cb(null);
        }
    }
};

Manager.prototype.remoteAdd = function(remote, cb) {
    var self = this;

    //TODO: Manage a new remote
    if(!remote) {
        cb(new Error('Please specify the remote to add'));
    }
};

Manager.prototype.remoteRm = function(remote, cb) {
    var self = this;

    //TODO: Remove a managed remote
};

Manager.prototype.workerReady = function(server, cb) {
    var self = this,
    worker = self._workers[server];

    var client = new enode.Client().connect(worker.socketFile, function(err, sock, conn) {
        if(err) {
            psm.log.error('Unable to connect to worker socket, using ' + worker.socketFile, err);
	    self.emit('ready::' + server, err);
	    if(cb) cb(err);
        } else {
            worker.socket = sock;
            worker.connection = conn;
            worker.ready = true;
            self.emit('ready::' + server);
	    if(cb) cb(null);
        }
    });
};

Manager.prototype.workerError = function(server, err, cb) {
    var self = this;

    self._workers[server] = null;
    self.emit('ready::' + server, err);

    cb(null);
};

Manager.prototype.workerSettings = function(server, cb) {
    var self = this;

    if(self._servers[server]) {
	if(cb) cb(null, self._servers[server]);
    } else {
	if(cb) cb(new Error('Unkown server.'));
    }
};

Manager.prototype._startApi = function(cb) {
    var self = this;

    self._api = new Api(psm, self);

    self._api.startup(cb);
};

Manager.prototype._loadRemotes = function(cb) {
    var self = this,
    Remote = mongoose.model('Remote');

    psm.log.debug('Loading remotes from MongoDB.');
    Remote.find({}, function (err, docs) {
	if(err) {
	    psm.log.error('Unable to load remotes from MongoDB.', err);
	    if(cb) cb(err);
	    return;
	}

	docs.forEach(function(remote) {
	    self._remotes[remote.uri] = remote;
	});
	
	if(cb) cb(null);
    });
};

Manager.prototype._storeRemotes = function(cb) {
    var self = this,
    Remote = mongoose.model('Remote'),
    done = 0,
    len = Object.keys(self._remotes).length,
    errors = [];

    psm.log.debug('Storing remotes currently loaded in memory');
    utile.each(self._remotes, function(remote, uri) {
	psm.log.silly('Upserting remote ' + name);
	Remote.update({ uri: uri }, remote, { upsert: true }, function(err) {
	    if(err) errors.push(err);
	    
	    done++;
	    if(done == len) {
		if(errors.length && cb) cb(errors);
		else if(cb) cb(null);
	    }
	});
    });
};

Manager.prototype._loadServers = function(cb) {
    var self = this,
    Server = mongoose.model('Server');

    psm.log.debug('Loading servers from MongoDB.');
    Server.find({}, function(err, docs) {
	if(err) {
	    psm.log.error('Unable to load servers from MongoDB.', err);
	    if(cb) cb(err);
	    return;
	}

	docs.forEach(function(server) {
	    self._servers[server.name] = server;
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
	psm.log.silly('Upserting server ' + name);
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