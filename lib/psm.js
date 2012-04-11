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
    this.servers = {};
};

//Psm inherits from EventEmitter
util.inherits(Psm, events.EventEmitter);

//executes a command on all servers being managed
Psm.prototype.cmdAll = function(args) {
    log('Commands on all servers not yet implemented', 'error');
    this.emit('cmd::done');
};

//main cmd wrapper, will call appropriate commands
//for appropriate server objects, or if one doesn't
//exist, it will create it
Psm.prototype.cmd = function(args) {
    var self = this,
    server = args[0],
    cmd = args[1];

    if(typeof(server) == 'object' && cmd == 'add') {
        self._addServer(server);
        self.emit('cmd::done');
    } else if(typeof(server) == 'string') {
        var id = self._findServerId(server);
        if(!self.settings.servers[id]) {
            log('No settings for ' + server + ' exists, please add it with "games add"', 'info');
            self.emit('cmd::done', false);
            return false;
        } else if(!self.servers[id]) {
            //store instance of this server
            self.servers[id] = self._loadServerModule(self.settings.servers[id]);

            if(!self.servers[id]) {
		log('Unable to load server module for "' + server + '"', 'error');
		log('Attempted file "' + rname + '" with class "' + mod + '"', 'error');
                self.emit('cmd:done', false);
                return false;
            }
        }

        if(cmd.charAt(0) == '_' || !self.servers[id][cmd]) {
            log('No command ' + cmd + ' exists on server ' + self.settings.servers[id].name, 'info');
            self.emit('cmd::done', false);
            return false;
        }

        //first 2 are game-id and cmd
        args.splice(0, 2);
        //run the command and echo cmd::done when complete
        self.servers[id][cmd](args);
        self.servers[id].on('cmd::done', function(data) {
            self.emit('cmd::done', data);
        });
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
    rname = path.join(__dirname, 'servers', sets.type, sub),
    mod = (sub.charAt(0).toUpperCase() + sub.slice(1));

    try {
        //this needs to be inflected to camel case
        //instead of just uppercasing the first letter
        var obj = require(rname)[mod];
        return new obj(sets);
    } catch(e) {
        return false;
    }
};
