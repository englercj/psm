/**
 * Panther Server Manager main class
 **/

var log = require('./logger').log,
utils = require('./utils'),
util = require('util'),
events = require('events'),
path = require('path');

var Psm = exports.Psm = function(servers) {
    events.EventEmitter.call(this);
    //parse server aliases list
    this.settings = {
	servers: servers
    };
    /*for(var sid in servers) {
	if(servers.hasOwnProperty(sid)) {
	    this._mapAliases(servers[sid]);
	}
    }*/

    this.servers = {};
};

//Psm inherits from EventEmitter
util.inherits(Psm, events.EventEmitter);

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

Psm.prototype._mapAliases = function(server) {
    for(var i in server['aliases']) {
	if(this.settings.servers[server['aliases'][i]]) {
	    log('Duplicate alias encountered: ' + server['aliases'][i] + '; ignoring...', 'error');
	} else 
	    this.settings.servers[server['aliases'][i]] = server;
    }
}

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
Psm.prototype.cmdAll = function(args) {
    log('Commands on all servers not yet implemented', 'error');
    this.emit('cmd::done');
};

Psm.prototype.cmd = function(args) {
    var self = this,
    server = args[0],
    cmd = args[1];

    if(typeof(server) == 'object' && cmd == 'add') {
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
	self.emit('cmd::done');
    } else if(typeof(server) == 'string') {
	var id = this._findServerId(server);
	if(!this.settings.servers[id]) {
	    log('No settings for ' + server + ' exists, please add it with "games add"', 'info');
	    self.emit('cmd::done', false);
	    return false;
	} else if(!this.servers[id]) {
	    //store instance of this server
	    var sets = this.settings.servers[id],
	    sub = (sets.subType ? sets.subType : sets.type),
	    rname = path.join(__dirname, 'servers', sets.type, sub),
	    mod = (sub.charAt(0).toUpperCase() + sub.slice(1));

	    try {
		//this needs to be inflected to camel case
		//instead of just uppercasing the first letter
		var obj = require(rname)[mod];
		this.servers[id] = new obj(sets);
	    } catch(e) {
		log('Unable to load server module for "' + server + '"', 'error');
		log('Attempted file "' + rname + '" with class "' + mod + '"', 'error');
		self.emit('cmd::done', false);
		return false;
	    }
	}
	
	if(!this.servers[id][cmd]) {
	    log('No command ' + cmd + ' exists on server ' + this.settings.servers[id].name, 'info');
	    self.emit('cmd::done', false);
	    return false;
	}

	//first 2 are game-id and cmd
	args.splice(0, 2);
	//run the command and echo cmd::done when complete
	this.servers[id][cmd](args);
	this.servers[id].on('cmd::done', function(data) { 
	    self.emit('cmd::done', data); 
	});
    }
};

Psm.prototype.addServer = function(server) {};

Psm.prototype.start = function(server) {
    
};
Psm.prototype.stop = function(server) {};
Psm.prototype.restart = function(server) {};
Psm.prototype.status = function(server) {};

Psm.prototype.startAll = function() {};
Psm.prototype.stopAll = function() {};
Psm.prototype.restartAll = function() {};
Psm.prototype.statusAll = function() {};
