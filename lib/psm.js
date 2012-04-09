/**
 * Panther Server Manager main class
 **/

var log = require('./logger').log;

var Psm = exports.Psm = function(servers) {
    var self = this;

    //parse server aliases list
    self._servers = servers;
    for(var sid in servers) {
	if(servers.hasOwnProperty(sid)) {
	    for(var i in servers[sid]['aliases']) {
		if(self._servers[servers[sid]['aliases'][i]]) {
		    log('Duplicate alias encountered: ' + servers[sid]['aliases'][i] + '; ignoring...', 'error');
		} else 
		    self._servers[servers[sid]['aliases'][i]] = servers[sid];
	    }
	}
    }
};

//expects (just like in server.json):
//"server-id": {
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
//}
Psm.prototype.addServer = function(server) {};

Psm.prototype.start = function(server) {};
Psm.prototype.stop = function(server) {};
Psm.prototype.restart = function(server) {};
Psm.prototype.status = function(server) {};

Psm.prototype.startAll = function() {};
Psm.prototype.stopAll = function() {};
Psm.prototype.restartAll = function() {};
Psm.prototype.statusAll = function() {};
