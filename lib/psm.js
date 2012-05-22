/**
 * Panther Server Manager main class
 **/

var Hook = require('hook.io').Hook,
utils = require('./utils'),
util = require('util'),
path = require('path'),
npm = require('npm');

var PsmHook = exports.PsmHook = function(options) {
    var self = this;

    Hook.call(self, options);

    self.once('hook::ready', function() {
	self.settings = {
	    config: require(path.join(__dirname, '../config/config.json'));
	    servers: require(path.join(__dirname, '../config/servers.json'));
	};
	
	self.servers = {};
	
	//load autoStart servers
	self._doAutoStarts();
	
	//setup event listeners
	self._setupListeners();
    });
};

//Psm inherits from EventEmitter
util.inherits(PsmHook, Hook);

//Reloads configuration files
PsmHook.prototype.reloadConfig = function(cb) {
    var self = this;

    try {
	self.settings.config = require(path.join(__dirname, '../config/config.json'));
	if(cb) cb(null);
    } catch(e) {
	if(cb) cb(e);
    }
};

//Reloads server configuration
PsmHook.prototype.reloadServers = function(cb) {
    var self = this;
    
    if(self.anyRunning()) {
	self.emit('log::error', 'Cannot reload server list with servers running.');
	if(cb) cb(new Error('Cannot reload server list with servers running.'));
	//self._cmdDone(emit, false);
    } else {
	try {
	    self.settings.servers = require(path.join(__dirname, '../config/servers.json'));
	    if(cb) cb(null);
	} catch(e) {
	    if(cb) cb(e);
	}
	//self.settings.servers = newServers;
	//self._logger.log('Server config reloaded', 'info');
	//self._doAutoStarts();
	//self.once('ready', function() {
	//self._cmdDone(emit);
	//});
    }    
};

//returns bool if any servers are running or not
PsmHook.prototype.anyRunning = function(cb) {
    var self = this;

    for(var srv in self.servers) {
	if(self.servers.hasOwnProperty(srv)) {
	    //check if we have server and is running
	    if(self.servers[srv] && self.servers[srv].isRunning()) {
		if(cb) cb(null, true);
		return true;
	    }
	}
    }

    if(cb) cb(null, false);
    return false;
};


//returns an object of server settings of the running servers
PsmHook.prototype.getRunning = function(cb) {
    var self = this,
    running = {};

    for(var srv in self.servers) {
	if(self.servers.hasOwnProperty(srv)) {
	    //check if we have server and is running
	    if(self.servers[srv] && self.servers[srv].isRunning())
		running[srv] = self.settings.servers[srv];
	}
    }

    if(cb) cb(null, running);
    return running;
};

//checks if a specific server is running
PsmHook.prototype.isRunning = function(server, cb) {
    var self = this,
    id = self._findServerId(server);
    
    if(cb) cb(null, self.servers[id] && self.servers[id].isRunning());
    return (self.servers[id] && self.servers[id].isRunning());
};

//returns server settings object
PsmHook.prototype.getServer = function(server, cb) {
    var self = this,
    id = self._findServerId(server);

    if(cb) cb(null, self.servers[id]);
    return self.servers[id];
};

//gets information about a specific server
//you can get a deep setting with dot notation
//eg: psm.getSetting('minecraft', 'paths.bin');
/*
PsmHook.prototype.options = function(server, option, value) {
    var self = this,
    id = self._findServerId(server);
    
    if(self.settings.servers[id]) {
	if(typeof(option) == 'string') {
	    var levels = option.split('.'),
	    opt = self.settings.servers[id],
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
*/
//executes a command on all servers being managed
PsmHook.prototype.cmdAll = function(args, cb) {
    var self = this;

    self.emit('log::error', 'Commands on all servers not yet implemented');
    if(cb) cb(new Error('Commands on all servers not yet implemented'));
};

//main cmd wrapper, will call appropriate commands
//for appropriate server objects, or if one doesn't
//exist, it will create it
PsmHook.prototype.cmd = function(server, cmd, args, cb) {
    var self = this;

    if(typeof(server) == 'object' && cmd == 'add') {
	//add new server
        self._addServer(server, cb);
    } else if(typeof(server) == 'string') {
	//find server id
        var id = self._findServerId(server);

        if(!self.settings.servers[id]) {
	    //no server settings found
	    self.emit('log::error', 'No settings for ' + server + ' exists, please add it with "games add"');
	    if(cb) cb(new Error('No settings for ' + server + ' exists, please add it with "games add"'));
        } else if(!self.servers[id]) {
	    //settings found, but we don't have an instance loaded
            //so lets load one up and store it
	    self._loadServerModule(self.settings.servers[id], function(err, module) {
		if(module) {
		    self.servers[id] = module;
		    self._doCmd(cmd, args, id, cb);
		} else {
		    self.emit('log::error', 'Unable to load server module for "' + self.settings.servers[id].type + '"');
		    if(cb) cb(err);
		}
	    });
            //self.servers[id] = self._loadServerModule(self.settings.servers[id]);
        } else {
	    self._doCmd(args, id, emit);
	}
    }
};

PsmHook.prototype._doCmd = function(cmd, args, id, cb) {
    var self = this;

    //if cmd is private or doesnt exist
    if(cmd.charAt(0) == '_' || !self.servers[id][cmd]) {
	self.emit('log::error', 'No command ' + cmd + ' exists on server ' + self.settings.servers[id].name, 'info');
	if(cb) cb(new Error('No command ' + cmd + ' exists on server ' + self.settings.servers[id].name, 'info'));
    } 
    //if cmd is a function
    else if(typeof(self.servers[id][cmd]) == 'function') {
	return self.servers[id][cmd](args, cb);
    } 
    //if cmd is a property
    else {
	if(cb) cb(null, self.servers[id][cmd]);
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
PsmHook.prototype._addServer = function(server, cb) {
    var self = this;

    if(self.settings.servers[server.name]) {
	self.emit('log::error', 'A server with that name already exists');
	if(cb) cb(new Error('A server with that name already exists'));
    } else {
        utils.extend(true, self.settings.servers, server);
	if(cb) cb(null);
    }
};

//searches for serverId or matching alias
PsmHook.prototype._findServerId = function(server) {
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
PsmHook.prototype._loadServerModule = function(sets, cb) {
    var self = this,
    module = 'psm-' + sets.type,
    loaded = self._doModuleLoad(sets);

    if(loaded) {
	if(cb) cb(null, loaded);
    } else {
	//Attempt to install module
	self.emit('log::info', 'Module not installed, loading npm...');
	npm.load({ loglevel: 'silent' }, function(err) {
	    if(err) {
		//if we fail to load npm just get out
		if(cb) cb(err, false);
		return;
	    }

	    self.emit('log::info', 'Attempting to install module from registry');
	    npm.commands.install([module], function(err, data) {
		if(err) {
		    //if we fail to install from registry try to install from github
		    self.emit('log::info', 'Module not found in registry, attempting to install from pantherdev github');
		    npm.commands.install(['https://github.com/pantherdev/' + module + '/tarball/master'], function(err, data) {
			if(err) {
			    //if we fail from github too, just get out
			    if(cb) cb(err, false);
			    return;
			}
			//module installed try loading again
			self.emit('log::info', 'Module successfully installed.');
			var module = self._doModuleLoad(sets);
			var err = (module ? null : new Error('Unable to load server module'));
			if(cb) cb(err, module);
		    });
		    return;
		}
		//module installed, try loading again
		self.emit('log::info', 'Module successfully installed.');
		var module = self._doModuleLoad(sets);
		var err = (module ? null : new Error('Unable to load server module'));
		if(cb) cb(err, module);
	    });
	});
    }
};

PsmHook.prototype._doModuleLoad = function(sets) {
    var self = this,
    module = 'psm-' + sets.type,
    //TODO: this needs to be inflected to camel case
    //instead of just uppercasing the first letter
    Class = (sets.type.charAt(0).toUpperCase() + sets.type.substring(1).toLowerCase());
    
    self.emit('log::debug', 'Attempting to load server module using module name: ' + module + ', Class: ' + Class);

    try {
        var obj = require(module)[Class];
	self.emit('log::debug', 'Load successful');
        return new obj(sets, this._logger);
    } catch(e) {
	return false;
    }
};

PsmHook.prototype._doAutoStarts = function() {
    var self = this,
    starting = 0;

    for(var s in self.settings.servers) {
	if(self.settings.servers.hasOwnProperty(s)) {
	    if(self.settings.servers[s].autoStart) {
		self.cmd(s, 'start', [], started);
		starting++;
	    }
	}
    }

    if(starting) {
	self.emit('log::info', 'Loading servers marked as autoStart...');
	function started() {
	    starting--;
	    if(!starting) {
		self.emit('log::info', 'autoStart servers have started.');
	    }
	}
    }
};