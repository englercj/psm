/**
 * Panther Server Manager main class
 **/

var log = require('./logger').log,
utils = require('./utils'),
util = require('util'),
events = require('events'),
path = require('path');

var Psm = exports.Psm = function(servers) {
    var self = this;

    events.EventEmitter.call(self);
    //parse server aliases list
    self.settings = {
        servers: servers
    };

    self.servers = {};

    //load autoStart servers
    for(var s in self.settings.servers) {
	if(self.settings.servers.hasOwnProperty(s)) {
	    if(self.settings.servers[s].autoStart) {
		self.cmd([s, 'start']);
	    }
	}
    }
};

//Psm inherits from EventEmitter
util.inherits(Psm, events.EventEmitter);

//returns bool is any servers are running or not
Psm.prototype.anyRunning = function() {
    var self = this;

    for(var srv in self.servers) {
	if(self.servers.hasOwnProperty(srv)) {
	    //check if we have server and is running
	    if(self.servers[srv] && self.servers[srv].isRunning()) return true;
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
	    if(self.servers[srv] && self.servers[srv].isRunning())
		running[srv] = self.settings.servers[srv];
	}
    }

    return running;
};

//checks if a specific server is running
Psm.prototype.isRunning = function(server) {
    var id = this._findServerId(server);
    return (this.servers[id] && this.servers[id].isRunning());
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
    log('Commands on all servers not yet implemented', 'error');
    
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
            log('No settings for ' + server + ' exists, please add it with "games add"', 'info');
	    self._cmdDone(emit, false);
            return false;
        } else if(!self.servers[id]) {
            //store instance of this server
            self.servers[id] = self._loadServerModule(self.settings.servers[id]);

            if(!self.servers[id]) {
		self._cmdDone(emit, false);
                return false;
            }
        }

        if(cmd.charAt(0) == '_' || !self.servers[id][cmd]) {
            log('No command ' + cmd + ' exists on server ' + self.settings.servers[id].name, 'info');
	    self._cmdDone(emit, false);
            return false;
        }

        //first 2 are game-id and cmd
        args.splice(0, 2);
	if(typeof(self.servers[id][cmd]) == 'function') {
            //run the command and echo cmd::done when complete
            self.servers[id].on('cmd::done', function(data) {
		self._cmdDone(emit, data);
            });
	    return self.servers[id][cmd](args);
	} else {
	    self._cmdDone(emit, self.servers[id][cmd]);
	    return self.servers[id][cmd];
	}
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
    if(this.settings.servers[server.name]) {
        log('A server with that name already exists', 'info');
    } else {
        utils.extend(true, this.settings.servers, server);
        var names = [];
        for(var i in server) {
            if(server.hasOwnProperty(i))
                names.push(server[i].name);
        }
        log('Server settings for ' + names.join(', ') + ' have been added', 'info');
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
Psm.prototype._loadServerModule = function(sets) {
    var sub = (sets.subType ? sets.subType : sets.type),
    rname = path.join(__dirname, 'servers', sets.type.toLowerCase(), sub.toLowerCase()),
    mod = (sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase());

    try {
        //this needs to be inflected to camel case
        //instead of just uppercasing the first letter
        var obj = require(rname)[mod];
        return new obj(sets);
    } catch(e) {
	log('Unable to load server module for "' + sets.type + '"', 'error');
	log('Attempted file "' + rname + '" with class "' + mod + '"', 'error');
	log('Got error: ' + e, 'error');

        return false;
    }
};


Psm.prototype._cmdDone = function(emit, data) {
    if(emit !== false)
	this.emit('cmd::done', data);
};