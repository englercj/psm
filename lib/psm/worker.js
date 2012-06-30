/**
 * worker.js: manages a single local gameserver instance
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var psm = require('../psm'),
request = require('request'),
enode = require('enode'),
forever = require('forever'),
utile = require('utile'),
cp = require('child_process'),
fs = require('fs'),
events = require('events'),
OutputParser = require('./helpers/output').OutputParser,
FileManager = require('./helpers/files').FileManager,
ProcManager = require('./helpers/proc').ProcManager;

var Worker = exports.Worker = function() {
    var self = this;
    events.EventEmitter.call(self);

    self._serverId = process.argv[2];
    self._socketFile = process.argv[3];
    self._managerPort = process.argv[4];

    psm.log.silly('Instantiating OutputParser');
    self.outputs = new OutputParser({
        logger: psm.log
    });

    self.outputs.on('error', function() {
        //hmmm...
    });

    psm.log.silly('Getting settings for this worker');
    self._getSettings(function(err, sets) {
        if(err) {
            psm.log.error(err, 'Unable to get settings');
            self._notifyError(err, function() {
                process.exit(1);
            });
            return;
        }

        self.server = sets;

        psm.log.silly('Instantiating FileManager');
        self.files = new FileManager({
            logger: psm.log,
            worker: self,
            backup: sets.backups,
            paths: sets.paths,
            worlds: sets.worlds,
            ramWorlds: sets.ramWorlds
        });

        psm.log.silly('Instantiating ProcManager');
        self.proc = new ProcManager({
            logger: psm.log,
            outputParser: self.outputs,
            startup: sets.startup,
            paths: sets.paths
        });

        psm.log.silly('Starting enode server');
        self._startServer(function(err) {
            if(err) {
                psm.log.error(err, 'Unable to start enode server');
                self._notifyError(err, function() {
                    process.exit(1);
                });
                return;
            }

            psm.log.silly('Notifying manager of ready state');
            self._notifyReady();
        });
    });

    process.on('exit', function() {
        try {
            fs.unlinkSync(self._socketFile);
        } catch(e) {
            psm.log.error(e, 'Unable to remove socket file');
        }
    });
};

utile.inherits(Worker, events.EventEmitter);

Worker.prototype.start = function(cb) {
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
        version: self.outputs.version
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

Worker.prototype._getSettings = function(cb) {
    var self = this,
    url = 'http://localhost:' + self._managerPort + '/worker/settings/' + self._serverId;

    request(url, function(err, res, body) {
        if(!err && res.statusCode == 200) {
            try {
                var data = JSON.parse(body);

                if(data.success && cb) cb(null, data.settings);
                else if(cb) cb(new Error(data.error));
            } catch(e) {
                if(cb) cb(e);
            }
        } else {
            psm.log.error(err, 'Error trying to get settings.');
            if(cb) cb(err ? err : new Error('Got non 200 status code (' + res.statusCode + ')'));
        }
    });
};

Worker.prototype._notifyReady = function(cb) {
    var self = this,
    url ='http://localhost:' + self._managerPort + '/worker/ready/' + self._serverId;

    request(url, function(err, res, body) {
        if(!err && res.statusCode == 200) {
            if(cb) cb(null);
        } else {
            psm.log.error(err, 'Error trying to notify manager.');
            if(cb) cb(err ? err : new Error('Got non 200 status code (' + res.statusCode + ')'));
        }
    });
};

Worker.prototype._notifyError = function(err, cb) {
    var self = this,
    opts = {
        url: 'http://localhost:' + self._managerPort + '/worker/error/' + self._serverId,
        method: 'POST',
        body: err.message
    };
    request(opts, function(err, res, body) {
        if(!err && res.statusCode == 200) {
            if(cb) cb(null);
        } else {
            psm.log.error(err, 'Error trying to notify manager.');
            if(cb) cb(err ? err : new Error('Got non 200 status code (' + res.statusCode + ')'));
        }
    });
};

Worker.prototype._startServer = function(cb) {
    var self = this, f;

    psm.log.silly('Checking for existance of socket.');
    try { f = fs.lstatSync(self._socketFile); } catch(e) {}

    if(f) {
        //socket exists
        //TODO: Check pid file and see if this is already running, and if not
        //then we can remove socket and do it over again.
        psm.log.error('Socket already exists, unable to start worker enode server!');
        if(cb) cb(new Error('Socket already exists, unable to start worker enode server!'));
        return;
    }

    psm.log.silly('Creating enode instance.');
    self._socket = new enode.Server({
        start: scopify(self, self.start),
        stop: scopify(self, self.stop),
        restart: scopify(self, self.restart),
        status: scopify(self, self.status),
        cmd: scopify(self, self.cmd),
        update: scopify(self, self.update),
        backupServer: scopify(self, self.backupServer),
        backupMaps: scopify(self, self.backupMaps),
        backupLogs: scopify(self, self.backupLogs),
        isRunning: scopify(self, self.isRunning)
    }).listen(self._socketFile);

    self._socket.on('error', function(err) {
        psm.log.error(err, 'Enode error!');
        if(cb) cb(err);
    });

    self._socket.on('ready', function() {
        if(cb) cb(null);
    });
};

function scopify(scope, fn) {
    return function() { fn.apply(scope, arguments); };
}