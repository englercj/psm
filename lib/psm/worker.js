/**
 * worker.js: manages a single local gameserver instance
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var psm = require('../psm'),
Hook = require('hook.io').Hook,
utile = require('utile'),
fs = require('fs'),
events = require('events'),
OutputParser = require('./helpers/output').OutputParser,
FileManager = require('./helpers/files').FileManager,
ProcManager = require('./helpers/proc').ProcManager;

var Worker = exports.Worker = function(options) {
    var self = this;

    Hook.call(self, options);

    self._serverId = self.name;


    self._setupActionListeners();
};

utile.inherits(Worker, Hook);

Worker.prototype.startServer = function(cb) {
    var self = this;

    psm.log.debug('Starting server ' + self._serverId);
    psm.log.silly('Checking world links...');
    self.files.checkWorldLinks(function(err) {
        if(err) {
            psm.log.error(err, 'Failed to check world links.');
            if(cb) cb(err);
            return;
        }

        psm.log.silly('Done.');
        psm.log.silly('Moving worlds to RAM');
        self.files.worldsToRam(function(err) {
            if(err) {
                psm.log.error(err, 'Failed to move worlds to RAM disk.');
                if(cb) cb(err);
                return;
            }

            psm.log.silly('Done.');
            psm.log.silly('Starting server');
            self.proc.start(function(err, proc) {
                if(err) {
                    psm.log.error(err, 'Unable to start minecraft process.');
                    if(cb) cb(err);
                    return;
                }

                psm.log.silly('Done.');
                if(cb) cb(null);
            });
        });
    });
};

Worker.prototype.stop = function(cb) {
    var self = this;

    psm.log.debug('Stopping server ' + self._serverId);
    psm.log.silly('Stopping server process');
    self.proc.stop(function(err) {
        if(err) {
            psm.log.error(err, 'Failed to stop minecraft process.');
            if(cb) cb(err);
            return;
        }

        psm.log.silly('Done.');
        psm.log.silly('Moving world files to disk');
        self.files.worldsToDisk(function(err) {
            if(err) {
                psm.log.error(err, 'Failed to move world files to disk.');
                if(cb) cb(err);
                return;
            }

            psm.log.silly('Done.');
            if(cb) cb(null);
        });
    });
};

Worker.prototype.restart = function(cb) {
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

            if(cb) cb(null);
        });
    });
};

Worker.prototype.status = function(cb) {
    var self = this,
    status = {
        running: self.proc.running,
        players: self.outputs.players,
	properties: self.files.properties,
        mcversion: self.outputs.mcversion,
	cbversion: self.outputs.cbversion
    };

    cb(null, status);
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

Worker.prototype.update = function(cb) {
    var self = this;

    self.files.update(cb);
};

Worker.prototype.backupServer = function(cb) {
    var self = this;

    self.files.backupServer(cb);
};

Worker.prototype.backupMaps = function(cb) {
    var self = this;

    self.files.backupMaps(cb);
};

Worker.prototype.backupLogs = function(cb) {
    var self = this;

    self.file.backupLogs(cb);
};

Worker.prototype.reloadConfig = function(cb) {
    var self = this;

    self._getSettings(cb);
};

Worker.prototype.isRunning = function(cb) {
    var self = this;

    if(cb) cb(null, self.proc.running);

    return self.proc.running;
};

Worker.prototype.startup = function(server, cb) {
    var self = this;

    self.server = server = JSON.parse(server);

    psm.init(function() {
	psm.log.silly('Instantiating OutputParser');
	self.outputs = new OutputParser({
            logger: psm.log
	});
	self._setupOutputListeners();
	
	
	psm.log.silly('Instantiating FileManager');
	self.files = new FileManager({
            logger: psm.log,
            worker: self,
            backup: server.backups,
            paths: server.paths,
            worlds: server.worlds,
            ramWorlds: server.ramWorlds
	});
	
	psm.log.silly('Instantiating ProcManager');
	self.proc = new ProcManager({
            logger: psm.log,
            outputParser: self.outputs,
            startup: server.startup,
            paths: server.paths
	});

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
    var self = this, s = self._serverId;

    self.on('action::' + s + '::startup', psm.proxy(self.startup, self));

    self.on('action::' + s + '::start', psm.proxy(self.startServer, self));
    self.on('action::' + s + '::stop', psm.proxy(self.stop, self));
    self.on('action::' + s + '::restart', psm.proxy(self.restart, self));
    self.on('action::' + s + '::status', psm.proxy(self.status, self));

    self.on('action::' + s + '::cmd', psm.proxy(self.cmd, self));
    self.on('action::' + s + '::update', psm.proxy(self.update, self));

    self.on('action::' + s + '::backupServer', psm.proxy(self.backupServer, self));
    self.on('action::' + s + '::backupMaps', psm.proxy(self.backupMaps, self));
    self.on('action::' + s + '::backupLogs', psm.proxy(self.backupLogs, self));

    self.on('action::' + s + '::reloadConfig', psm.proxy(self.reloadConfig, self));

    self.on('action::' + s + '::isRunning', psm.proxy(self.isRunning, self));
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