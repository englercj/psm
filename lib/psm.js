/**
 * Panther Server Manager main class
 **/

var log = require('./logger').log,
path = require('path');

require('./utils');

var Psm = exports.Psm = function(servers) {
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
Psm.prototype.cmd = function(server, cmd) {
    if(typeof(server) == 'object' && cmd == 'add') {
	if(this.settings.servers[server.name]) {
	    log('A server with that name already exists', 'info');
	} else {
	    this.settings.servers.extend(server);
	    log('Server settings for ' + server.name + ' have been added', 'info');
	}
    } else if(typeof(server) == 'string') {
	var id = this._findServerId(server);
	if(!this.settings.servers[id]) {
	    log('No settings for ' + server + ' exists, please add it with "games add"', 'info');
	    return false;
	} else if(!this.servers[id]) {
	    //store instance of this server
	    var sets = this.settings.servers[id],
	    sub = (sets.subType ? sets.subType : sets.type),
	    rname = path.join(__dirname, 'server', sets.type, sub),
	    mod = (sub.charAt(0).toUpperCase() + sub.slice(1));

	    try {
		//this needs to be inflected to camel case
		//instead of just uppercasing the first letter
		this.servers[id] = require(rname)[mod];
		console.log(this.servers[id]);
	    } catch(e) {
		log('Unable to load server module for "' + server + '"', 'error');
		log('Attempted file "' + rname + '" with class "' + mod + '"', 'error');
		return false;
	    }
	}
	
	if(!this.servers[id][cmd]) {
	    log('No command ' + cmd + ' exists on server ' + this.settings.servers[id].name, 'info');
	    return false;
	}

	this.servers[id][cmd]();
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
