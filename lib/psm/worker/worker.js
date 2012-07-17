/**
 * worker.js: manages a single local gameserver instance
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var psm = require('../../psm'),
Hook = require('hook.io').Hook,
utile = require('utile'),
fs = require('fs'),
events = require('events'),
helpers = utile.requireDir('./helpers');

var Worker = exports.Worker = function(options) {
    var self = this;

    Hook.call(self, options);

    self._serverId = self.name;

    self._setupActionListeners();
};

utile.inherits(Worker, Hook);

//These functions have an unused 'n' param due to the way
//the manager calls these functions. The 'n' slot is reserved
//for extra data, and if their is none then 'null' is sent.
//The 'n' consumes the 'null' so the cb falls in the right place.
Worker.prototype.startServer = function(n, cb) {
    var self = this;

    psm.log.debug('Starting server ' + self._serverId);
    psm.log.silly('Checking world links...');
    self.files.checkWorldLinks(function(err) {
        if(err) {
            psm.log.error(err, 'Failed to check world links.');
            if(cb) cb(err);
            return;
        }

        psm.log.silly('Moving worlds to RAM');
        self.files.worldsToRam(function(err) {
            if(err) {
                psm.log.error(err, 'Failed to move worlds to RAM disk.');
                if(cb) cb(err);
                return;
            }

            psm.log.silly('Starting server');
            self.proc.start(function(err, proc) {
                if(err) {
                    psm.log.error(err, 'Unable to start minecraft process.');
                    if(cb) cb(err);
                    return;
                }

                psm.log.silly('Done.');
                if(cb) cb();
            });
        });
    });
};

Worker.prototype.stop = function(n, cb) {
    var self = this;

    psm.log.debug('Stopping server ' + self._serverId);
    psm.log.silly('Stopping server process');
    self.proc.stop(function(err) {
        if(err) {
            psm.log.error(err, 'Failed to stop minecraft process.');
            if(cb) cb(err);
            return;
        }

        psm.log.silly('Moving world files to disk');
        self.files.worldsToDisk(function(err) {
            if(err) {
                psm.log.error(err, 'Failed to move world files to disk.');
                if(cb) cb(err);
                return;
            }

            psm.log.silly('Done.');
            if(cb) cb();
        });
    });
};

Worker.prototype.restart = function(n, cb) {
    var self = this;

    psm.log.debug('Restarting server ' + self._serverId);
    psm.log.silly('Stopping server process');
    self.proc.stop(function(err) {
        if(err) {
            psm.log.error(err, 'Failed to stop minecraft process.');
            if(cb) cb(err);
            return;
        }

        psm.log.silly('Done.');
        psm.log.silly('Moving world files to disk');
        self.proc.start(function(err, proc) {
            if(err) {
                psm.log.error(err, 'Failed to start minecraft process.');
                if(cb) cb(err);
                return;
            }

            if(cb) cb();
        });
    });
};

Worker.prototype.status = function(n, cb) {
    var self = this,
    status = {
        running: self.proc.running,
        players: self.outputs.players,
	properties: self.files.properties,
        mcversion: self.outputs.mcversion,
	cbversion: self.outputs.cbversion
    };

    if(cb) cb(null, status);
};

Worker.prototype.cmd = function(cmd, cb) {
    var self = this;

    if(cmd instanceof Array) {
        cmd = cmd.join(' ');
    }

    self.proc.input(cmd + '\n', function(err) {
        if(err) { psm.log.error(err, 'Unable to do command ' + cmd); }

        if(cb) cb(err);
    });
};

Worker.prototype.update = function(n, cb) {
    this.files.update(cb);
};

Worker.prototype.backupServer = function(n, cb) {
    this.files.backupServer(cb);
};

Worker.prototype.backupMaps = function(n, cb) {
    this.files.backupMaps(cb);
};

Worker.prototype.backupLogs = function(n, cb) {
    this.file.backupLogs(cb);
};

Worker.prototype.reloadConfig = function(n, cb) {
    this._getSettings(cb);
};

Worker.prototype.isRunning = function(n, cb) {
    if(cb) cb(null, this.proc.running);

    return this.proc.running;
};

Worker.prototype.startup = function(server, cb) {
    var self = this;

    try {
	self.server = server = JSON.parse(server);
    } catch(e) {
	psm.log.error(e, 'Unable to startup worker process.');
    }

    psm.init(function() {
	var args = {
	    logger: psm.log,
	    worker: self,
	    server: server
	};

	psm.log.silly('Instantiating OutputParser');
	self.outputs = new helpers.output.OutputParser(args);
	self._setupOutputListeners();
	
	psm.log.silly('Instantiating FileManager');
	self.files = new helpers.files.FileManager(args);
	
	psm.log.silly('Instantiating ProcManager');
	self.proc = new helpers.proc.ProcManager(args);

	psm.log.silly('Instantiating PluginManager');
	self.plugins = new helpers.plugins.PluginManager(args);

	psm.log.silly('Instantiating WorldManager');
	self.worlds = new helpers.worlds.WorldManager(args);

	psm.log.silly('Instantiating JobManager');
	self.jobs = new helpers.jobs.JobManager(args);

	if(cb) cb();
    });
};

Worker.prototype._notifyEvent = function(event, data, cb) {
    var self = this;

    if(typeof(data) == 'function') {
	cb = data;
	data = {};
    }

    data.server = self._serverId;

    self.emit('event::' + event, data, cb);
};

Worker.prototype._setupActionListeners = function() {
    var self = this,
    actions = [
	'startup', 
	'start', 'stop', 'restart', 'status',
	'cmd', 'update',
	'backupServer', 'backupMaps', 'backupLogs',
	'reloadConfig', 'isRunning'
    ];

    actions.forEach(function(act) {
	//the ternary is for calling startServer when act is start
	self.on('action::' + self._serverId + '::' + act, 
		psm.proxy(self[act == 'start' ? 'startServer' : act], self));
    });
};

Worker.prototype._setupOutputListeners = function() {
    var self = this;

    self.outputs.on('mcerror', function(message, type) {
        //hmmm...had a MC error of some kind
    });

    self.outputs.on('mcwarn', function(message, type) {
        //hmmm...had a MC warning
    });

    self.outputs.on('output', function(lines) {
	self._notifyEvent('output', { lines: lines });
    });

    self.outputs.on('player::connect', function(timestamp, name) {
	self._notifyEvent('player::connect', { timestamp: timestamp, name: name });
    });

    self.outputs.on('player::disconnect', function(timestamp, name) {
	self._notifyEvent('player::disconnect', { timestamp: timestamp, name: name });
    });

    self.outputs.on('player::chat', function(timestamp, name, msg) {
	self._notifyEvent('player::chat', { timestamp: timestamp, name: name, msg: msg });
    });
};