/**
 * manager.js: manages local servers and remote manager nodes
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var path = require('path'),
events = require('events'),
mongodb = require('mongodb'),
utile = require('utile'),
dnode = require('dnode'),
portfinder = require('portfinder'),
Api = require('./api'),
psm = require('../psm');

var Manager = exports.Manager = function() {
    var self = this;

    self._servers = {};
    self._db = false;
};

Manager.prototype.startup = function(cb) {
    var margs = psm.config.get('mongodb');
    self._connector = new mongodb.Db(margs.database, new mongodb.Server(margs.host, margs.port));
    self._connector.open(function(err, db) {
	if(err) {
	    psm.log.error('Could not connect to MongoDB.', err);
	    if(cb) cb(err);
	    return;
	}

	self._db = db;
	self._loadServers();

	self._startServer(function(err) {
	    if(err) { if(cb) cb(err); return; }
	    
	    self._startApi(function(err) {
		if(err) { if(cb) cb(err); return; }
		
		if(cb) cb(null);
	    });
	});
    });    
};

Manager.prototype.stop = function(server, remote, cb) {
};

Manager.prototype.restart = function(server, remote, cb) {
};

Manager.prototype.status = function(server, remote, cb) {
};

Manager.prototype.list = function(remote, cb) {
};

Manager.prototype.openStream = function(server, remote, cb) {
};

Manager.prototype.serverAdd = function(server, remote, cb) {
};

Manager.prototype.serverRm = function(server, remote, cb) {
};

Manager.prototype.remoteAdd = function(remote, cb) {
};

Manager.prototype.remoteRm = function(remote, cb) {
};

Manager.prototype._startApi = function(cb) {
    var self = this;

    self._api = new Api(psm, self);

    self._api.startup(cb);
};

Manager.prototype._startServer = function(cb) {
    var self = this,
    socket = path.join(psm.config.get('socket:dir', 'psm-manager.sock'));

    psm.log.silly('Creating dnode instance.');
    self._server = dnode({
	start: scopify(self, self.start),
	stop: scopify(self, self.stop),
	restart: scopify(self, self.restart),
	status: scopify(self, self.status),
	list: scopify(self, self.list),
	openStream: scopify(self, self.openStream),
	serverAdd: scopify(self, self.serverAdd),
	serverRm: scopify(self, self.serverRm),
	remoteAdd: scopify(self, self.remoteAdd),
	remoteRm: scopify(self, self.remoteRm)
    });
    
    portfinder.getSocket({ path: socket }, function(err, socket) {
	if(err) {
	    psm.log.error('Error attempting to create manager socket.', err);
	    if(cb) cb(err);
	    return;
	}
	self._server.on('error', function(err) {
	    psm.log.error('Dnode error!', err);
	});

	self._server.on('ready', function(err) {
	    if(err) {
		psm.log.error('Dnode startup error!', err);
		if(cb) cb(err);
	    } else {
		psm.log.debug('Dnode started.');
		self._server.listen(socket);
		if(cb) cb(null);
	    }
	});
    });
};

Manager.prototype._loadRemotes = function() {

};

Manager.prototype._loadServers = function() {
    var self = this;

    psm.log.silly('Opening psm-server collection for loading.');
    self._db.collection('psm-servers', function(err, collection) {
	if(err) {
	    psm.log.error('Unable to open collection psm-servers.', err);
	    return;
	}

	psm.log.silly('psm-servers collection opened.');
	psm.log.silly('Getting cursor for psm-servers collection.');
	collection.find(function(err, cursor) {
	    if(err) {
		psm.log.error('Unable to open cursor in psm-servers collection.', err);
		return;
	    }

	    psm.log.silly('Got cursor for psm-servers collection');
	    cursor.each(function(err, item) {
		if(err) {
		    psm.log.error('Unable to iterate through psm-servers cursor.', err);
		    return;
		}

		if(item !== null) {
		    psm.log.silly('Adding item: ' + item._id);
		    self._servers[item._id] = item;
		}
	    });
	});
    });
};

Manager.prototype._storeServers = function() {
    var self = this;

    psm.log.silly('Opening psm-servers collection for saving.');
    self._db.collection('psm-servers', function(err, collection) {
        if(err) { 
	    psm.log.error('Unable to open collection psm-servers.', err);
	    return; 
	}

	psm.log.silly('psm-servers collection opened.');
	psm.log.silly('Iterating through all stored servers');
	utile.each(self._servers, function(server, sid) {
	    if(server.dirty) {
		psm.log.debug('Dirty server found, saving');

		if(server._id === undefined) server._id = sid;
		server.dirty = false;

		psm.log.silly('Sending upsert for server: ' + sid);
		collection.update({ _id: sid }, { $set: server }, { upsert: true }, function(err, objects) {
		    if(err) { 
			psm.log.error('Unable to upsert server object.', err);
			return; 
		    }

		    psm.log.debug('Dirst server saved.');
		});
	    }
	});
    });
};

function scopify(scope, fn) {
    return function() { fn.apply(scope, arguments); };
}

/**
 * Panther Server Manager main class
 **/
/*
var //log = require('./logger').log,
utils = require('./utils'),
util = require('util'),
events = require('events'),
path = require('path'),
npm = require('npm');

var Psm = exports.Psm = function(servers, logger) {
    var self = this;

    events.EventEmitter.call(self);
    //parse server aliases list
    self.settings = {
        servers: servers
    };

    self.servers = {};
    self._logger = logger;

    //load autoStart servers
    self._doAutoStarts();
};

//Psm inherits from EventEmitter
util.inherits(Psm, events.EventEmitter);

Psm.prototype.reloadConfig = function(newConfig, emit) {
    var self = this;

    //stub incase psm uses config in the future
};

Psm.prototype.reloadServers = function(newServers, emit) {
    var self = this;

    if(self.anyRunning()) {
	self._logger.log('Cannot reload server list with servers running!', 'error');
	self._cmdDone(emit, false);
    } else {
	self.settings.servers = newServers;
	self._logger.log('Server config reloaded', 'info');
	self._doAutoStarts();
	self.once('ready', function() {
	    self._cmdDone(emit);
	});
    }
};

//returns bool is any servers are running or not
Psm.prototype.anyRunning = function() {
    var self = this;

    for(var srv in self.servers) {
	if(self.servers.hasOwnProperty(srv)) {
	    //check if we have server and is running
	    if(self.servers[srv] && self.servers[srv].isRunning(false)) return true;
	}
    }
};


//returns an object of server settings of the running servers
Psm.prototype.getRunning = function() {
    var self = this,
    running = {};

    for(var srv in self.servers) {
	if(self.servers.hasOwnProperty(srv)) {
	    //check if we have server and is running
	    if(self.servers[srv] && self.servers[srv].isRunning(false))
		running[srv] = self.settings.servers[srv];
	}
    }

    return running;
};

//checks if a specific server is running
Psm.prototype.isRunning = function(server) {
    var id = this._findServerId(server);
    return (this.servers[id] && this.servers[id].isRunning(false));
};

Psm.prototype.getServer = function(server) {
    var id = this._findServerId(server);

    return this.servers[id];
};

//gets information about a specific server
//you can get a deep setting with dot notation
//eg: psm.getSetting('minecraft', 'paths.bin');
Psm.prototype.options = function(server, option, value) {
    var id = this._findServerId(server);
    if(this.settings.servers[id]) {
	if(typeof(option) == 'string') {
	    var levels = option.split('.'),
	    opt = this.settings.servers[id],
	    i = levels.length - 1,
	    key;

	    if(option == '*') {
		opt.sid = id;
		return opt;
	    }

	    while(i--) opt = opt[levels.shift()];
	    key = levels.shift();

	    if(value === undefined) return opt[key];

	    if(typeof(value) == 'object')
		utils.extend(true, opt[key], value);
	    else
		opt[key] = value;
	}
    }
};

//executes a command on all servers being managed
Psm.prototype.cmdAll = function(args, emit) {
    this._logger.log('Commands on all servers not yet implemented', 'error');
    
    this._cmdDone(emit);
};

//main cmd wrapper, will call appropriate commands
//for appropriate server objects, or if one doesn't
//exist, it will create it
Psm.prototype.cmd = function(args, emit) {
    var self = this,
    server = args[0],
    cmd = args[1];

    if(typeof(server) == 'object' && cmd == 'add') {
        self._addServer(server);
	self._cmdDone(emit);
    } else if(typeof(server) == 'string') {
        var id = self._findServerId(server);

        if(!self.settings.servers[id]) {
            self._logger.log('No settings for ' + server + ' exists, please add it with "games add"', 'info');
	    self._cmdDone(emit, false);
            return false;
        } else if(!self.servers[id]) {
            //store instance of this server
	    self._loadServerModule(self.settings.servers[id], function(module) {
		if(module) {
		    self.servers[id] = module;
		    self._doCmd(args, id, emit);
		} else {
		    self._logger.log('Unable to load server module for "' + self.settings.servers[id].type + '"', 'error');
		    self._cmdDone(emit, false);
		}
	    });
            //self.servers[id] = self._loadServerModule(self.settings.servers[id]);
        } else {
	    self._doCmd(args, id, emit);
	}
    }
};

Psm.prototype._doCmd = function(args, id, emit) {
    var self = this,
    cmd = args[1];

    if(cmd.charAt(0) == '_' || !self.servers[id][cmd]) {
	self._logger.log('No command ' + cmd + ' exists on server ' + self.settings.servers[id].name, 'info');
	self._cmdDone(emit, false);
	return false;
    }
    
    //first 2 are game-id and cmd
    args.splice(0, 2);
    if(typeof(self.servers[id][cmd]) == 'function') {
	//run the command and echo cmd::done when complete	    
	self.servers[id].once('cmd::done', function(data) {
	    self._cmdDone(emit, data);
	});
	return self.servers[id][cmd](args);
    } else {
	self._cmdDone(emit, self.servers[id][cmd]);
	return self.servers[id][cmd];
    }    
};

//expects (just like in server.json):
//{
// "server-id": {
//    "type": "server-type",
//    "subType": "server-subtype",
//    "aliases": ["server-id-alias", "..."],
//    "name": "Server Name or Title",
//    "paths": {
//        "bin": "/path/to/bin",
//        "logs": "/path/to/logging/dir",
//        "backup": "/path/to/where/backups/should/be/stored"
//    },
//    "type-specific-opts": ""
//    "...": "..."
// }
//}
Psm.prototype._addServer = function(server) {
    var self = this;

    if(self.settings.servers[server.name]) {
        self._logger.log('A server with that name already exists', 'info');
    } else {
        utils.extend(true, self.settings.servers, server);
        var names = [];
        for(var i in server) {
            if(server.hasOwnProperty(i))
                names.push(server[i].name);
        }
        self._logger.log('Server settings for ' + names.join(', ') + ' have been added', 'info');
    }
};

//searches for serverId or matching alias
Psm.prototype._findServerId = function(server) {
    var srvs = this.settings.servers;

    for(var i in srvs) {
        if(srvs.hasOwnProperty(i)) {
            if(i == server) return i;

            var found;
            srvs[i]['aliases'].forEach(function(a) {
                if(a == server) found = true;
            });

            if(found) return i;
        }
    }
};

//loads a server module for instantiating a server
//////TODO: Flow:
// - Attempt to load module
// - if fail:
//   - Attempt to npm install the module
//   - if fail:
//     - Attempt to npm install module from repo at pantherdev github
//     - if fail:
//       - UNABLE TO LOAD MODULE
//     - if success:
//       - reattempt loading
//  - if success:
//    - re attempt loading
// - if success:
//   - MODULE LOADED
// - if fails second time:
//   - UNABLE TO LOAD MODULE
Psm.prototype._loadServerModule = function(sets, cb) {
    var self = this,
    module = 'psm-' + sets.type,
    loaded = self._doModuleLoad(sets);

    if(loaded) {
	if(cb) cb(loaded);
    } else {
	//Attempt to install module
	self._logger.log('Module not installed, loading npm...', 'info');
	npm.load({ loglevel: 'silent' }, function(err) {
	    if(err) {
		//if we fail to load npm just get out
		self._logger.log('Unable to load npm', 'error');
		self._logger.log('Got error: ' + e, 'error');
		if(cb) cb(false);
		return;
	    }

	    self._logger.log('Attempting to install module from registry', 'info');
	    npm.commands.install([module], function(err, data) {
		if(err) {
		    //if we fail to install from registry try to install from github
		    self._logger.log('Module not found in registry, attempting to install from pantherdev github', 'info');
		    npm.commands.install(['https://github.com/pantherdev/' + module + '/tarball/master'], function(err, data) {
			if(err) {
			    //if we fail from github too, just get out
			    self._logger.log('Unable to install server module for "' + sets.type + '"', 'error');
			    self._logger.log('Got error: ' + e, 'error');
			    if(cb) cb(false);
			    return;
			}
			//module installed try loading again
			self._logger.log('Module successfully installed.', 'info');
			if(cb) cb(self._doModuleLoad(sets));
		    });
		    return;
		}
		//module installed, try loading again
		self._logger.log('Module successfully installed.', 'info');
		if(cb) cb(self._doModuleLoad(sets));
	    });
	});
    }
};

Psm.prototype._doModuleLoad = function(sets) {
    var self = this,
    module = 'psm-' + sets.type,
    //TODO: this needs to be inflected to camel case
    //instead of just uppercasing the first letter
    Class = (sets.type.charAt(0).toUpperCase() + sets.type.substring(1).toLowerCase());

    self._logger.log('Attempting to load server module using module name: ' + module + ', Class: ' + Class, 'debug');

    try {
        var obj = require(module)[Class];
        self._logger.log('Load successful', 'debug');
        return new obj(sets, this._logger);
    } catch(e) {
	return false;
    }
};

Psm.prototype._doAutoStarts = function() {
    var self = this,
    starting = 0;

    for(var s in self.settings.servers) {
	if(self.settings.servers.hasOwnProperty(s)) {
	    if(self.settings.servers[s].autoStart) {
		self.cmd([s, 'start']);
		starting++;
	    }
	}
    }

    if(starting) {
	self._logger.log('Loading servers marked as autoStart...', 'info', true, true);
	self.on('cmd::done', started);
	function started() {
	    starting--;
	    if(!starting) {
		self._logger.log('Done!', 'info', true, true);
		self.removeListener('cmd::done', started);
		self.emit('ready');
	    }
	}
    } else {
	self.emit('ready');
    }
};

Psm.prototype._cmdDone = function(emit, data) {
    if(emit !== false)
	this.emit('cmd::done', data);
};
*/