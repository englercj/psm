/**
 * Minecraft server class for controlling minecraft servers
 **/
var Server = require('../server').Server,
fs = require('fs'),
path = require('path'),
wrench = require('wrench'),
spawn = require('child_process').spawn,
exec = require('child_process').exec,
colors = require('colors'),
util = require('util'),
utils = require('../../utils'),
log = require('../../logger').log;

var Minecraft = exports.Minecraft = function(options) {
    var self = this;
    Server.call(self, options);

    //set startup variables
    self._startup.cmd = 'java';
    self._startup.args = [
        '-Xmx' + self._settings.maxMem,
        '-Xms' + self._settings.initMem,
        '-XX:+UseConcMarkSweepGC',
        '-XX:+CMSIncrementalPacing',
        '-XX:ParallelGCThreads=' + self._settings.cpus,
        '-XX:+AggressiveOpts',
        '-jar',
        path.join(self._settings.paths.bin, self._settings.jar),
        'nogui'
    ];
    self._startup.cwd = self._settings.paths.bin;

    //minecraft specific tracking variables
    self._players = [];

    //minecraft specific output parsers
    self.on('stdout', parseOutput);
    self.on('stderr', parseOutput);

    self._outputParsers = [
        function(str) {
            //player connect
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] ([^\s]+) \[\/([\d\.:]+)\] logged in with entity id ([\d]+) at \((\[([^\s]+)\] )?([\d\.\-\, ]+)\)$/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = player name,
                //3 = IP:Port
                //4 = entity id
                //5 = [worldname]
                //6 = worldname
                //7 = location logged into
                var name = parts[2];

                if(this._players.indexOf(name) === -1) {
                    this.emit('player::connect', name);
                    log('Player connected: ' + name, 'debug');
                    this._players.push(name);
                }
            }
        },
        function(str) {
            //player disconnect
            var i, player,
            parts = str.match(/^([0-9\-: ]+) \[INFO\] ([^\s]+) lost connection: ([\w\. ]+)$/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = player name,
                //3 = reason
                this.emit('player::disconnect', parts[2]);
                log('Player disconnected: ' + parts[2], 'debug');
                i = this._players.indexOf(parts[2]);
                if(i !== -1)
                    this._players.splice(i, 1);
            }
        },
        function(str) {
            //chat message
            str = str.stripColors;
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] <([^>]+)> (.*)$/);

            if(parts)  {
                //0 = entire msg,
                //1 = timestamp,
                //2 = player name,
                //3 = message
                log('Player ' + parts[2] + ' chatted: ' + parts[3], 'debug');
                this.emit('player::chat', parts[2], parts[3]);
            }
        },
        function(str) {
            //server startup
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] Done \(([0-9\.s]+)\)!/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = startup time
                log('Minecraft has started up (' + parts[2] + ')', 'info');
                self._startup.started = true;
                this.emit('startup::done');
            }
        },
        function(str) {
            //errors
            var parts = str.match(/^([0-9\-: ]+) \[(SEVERE|WARNING|FATAL)\] (.*)$/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = message type,
                //3 = message
                var scrn = (parts[2] == 'FATAL');

                //I have NO IDEA why this is just a warning...
                if(scrn || (parts[2] == 'WARNING' && parts[3] == '**** FAILED TO BIND TO PORT!')) {
                    //we need to log the error and kill the server
                    log('Minecraft unable to start: ' + parts[3], 'error');
                    this.stop(true, true);
                } else {
                    log('Minecraft Error: ' + parts[0], 'error', scrn);
                }
            }
        },
        function(str) {
            //log when generating map
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] Preparing (level|spawn area:) ([\w\"\d%]+)$/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = level OR spawn area:
                //3 = "world_name" OR #%
                log(parts[0].replace(parts[1] + ' [INFO] ', ''), 'info');
            }
        },
        function(str) {
            //version string
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] Starting minecraft server version ([\d\.]+)$/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = version
                this._version = parts[2];
            }
        }
    ];

    function parseOutput(data) {
        var str = data.toString().trim();

        self._outputParsers.forEach(function(parser) {
            parser.call(self, str);
        });
    }
};

//Minecraft inherits from Server class
util.inherits(Minecraft, Server);

//Uncomment to override:
//Minecraft.prototype.cmd = function(args, emit) {};
//Minecraft.prototype.restart = function(emit) {};

Minecraft.prototype.start = function(emit) {
    //minecraft specific file management stuff
    this._checkWorldLinks();
    this._worldsToRam();

    //pass off start to server base
    Server.prototype.start.apply(this, arguments);
};

//Public access to players connected:
Minecraft.prototype.getPlayers = function(emit) {
    //emit and return players
    this._cmdDone(emit, this._players);
    return this._players;
};

//Public methods overriding base Server
Minecraft.prototype.stop = function(emit) {
    var self = this;

    if(self.isRunning()) {
        log('Stopping server...', 'info');
        //send mc specific stop cmds
        self.cmd('stop', false);

        //emit complete when done with shutdown
        self.once('shutdown::done', function() {
            self._worldsToDisk();
            self._cmdDone(emit);
        });
        self._resetIdle();
        self._stopping = true;

        return true;
    }

    log(self._settings.name + ' is not running', 'info');
    self._cmdDone(emit);
    return false;
};

Minecraft.prototype.status = function(emit) {
    var stats = {
        up: this.isRunning(),
        players: this._players,
        version: this._version
    };

    this._cmdDone(emit, stats);
    return stats;
};

Minecraft.prototype.update = function(emit) {
    var self = this;
    self._updateFile(
        'minecraft_server.jar',
        'https://s3.amazonaws.com/MinecraftDownload/launcher/minecraft_server.jar',
        function(err) {
            switch(err) {
            case 'ERUNNING':
                log('Cannot update server while it is running', 'info');
                break;
            case 'ESAME':
                log('You are already running the latest Minecraft Server version', 'info');
                break;
            case 'EDOWNLOAD':
                log('There was an error downloading the Minecraft Server update', 'error');
                break;
            default:
                log('Minecraft Server successfully updated', 'info');
            }
            self._cmdDone(emit);
        }
    );
};

Minecraft.prototype.backupMaps = function(emit) {
    if(!this._settings.backups || !this._settings.backups.logs || !this._settings.backups.logs.enabled) {
        this._cmdDone(emit, false);
        return false;
    }

    var self = this,
    worldDisk = self._settings.paths.worldDisk,
    worlds = self._settings.worlds,
    bak = self._settings.backups.maps.path,
    done = 0;

    if(self.isRunning()) {
	self.cmd('say Backing up maps...', false);

    //make sure backup path exists
    wrench.mkdirSyncRecursive(bak);

    worlds.forEach(function(world) {
        dname = utils.datepath(path.join(bak, world + '_'));
        log('Backing up ' + world + ' to ' + dname + '...', 'info');

        //use tar to get the file there
        exec('tar -hcjf ' + dname + '.tar.bz2 ' + path.join(worldDisk, world), function(err, stdout, stderr) {
            if(err !== null) {
                log('Error taring backup for ' + world, 'error');
                log('Got error: ' + err, 'error');
            }
            log(world + ' has been backed up', 'info');
            done++;
            if(done == worlds.length) {
		if(self.isRunning())
		    self.cmd('say Backups completed!', false);
                self._cmdDone(emit);
	    }
        });
    });
};

Minecraft.prototype.backupLogs = function(emit) {
    var self = this;

    if(!self._settings.backups || !self._settings.backups.logs || !self._settings.backups.logs.enabled) {
        self._cmdDone(emit, false);
        return false;
    }

    if(self.isRunning()) {
        log('Shutting down server to backup logs...', 'info');
        self.cmd('say Restarting the server for maintenance..', false);
	setTimeout(function() {
            self.stop(false);
            self.once('shutdown::done', function() {
		doBackupLogs.call(self);
            });
	}, 5000);
    }

    function doBackupLogs() {
        var self = this,
	logP = path.join(self._settings.paths.logs, 'server.log'),
        bak = self._settings.backups.logs.path,
        fname = utils.datepath(path.join(bak, 'serverlog_'));

        log('Backing up server.log to ' + fname + '...', 'info');
        wrench.mkdirSyncRecursive(bak);
        try {
            fs.renameSync(logP, fname);
        } catch(e) {
            if(e.code == 'ENOENT') {
                log('No server.log to backup', 'info');
                self._cmdDone(emit, false);
                return false;
            } else {
                throw e;
            }
        }

        log('Gzipping backed up logfile...', 'info');
        //gzip logfile
        exec('gzip ' + fname, function(err, stdout, stderr) {
            if(err !== null) {
                log('Error gzipping backup logfile ' + logP, 'error');
                log('Got error: ' + err, 'error');
            }
	    self.start(false);
	    self.once('startup::done', function() {
		self._cmdDone(emit);
	    });
        });
    }
};

Minecraft.prototype._checkWorldLinks = function() {
    var self = this,
    bin = self._settings.paths.bin,
    worldRam = self._settings.paths.worldRam,
    worldDisk = self._settings.paths.worldDisk,
    ramWorlds = self._settings.ramWorlds,
    worlds = self._settings.worlds,
    allGood = true;

    //only do link stuff if we store worlds somewhere
    //other that the main mc folder
    if(bin == worldDisk) return;

    try {
        var d = fs.statSync(worldDisk);
    } catch(e) {
        //doesnt exist
        wrench.mkdirSyncRecursive(worldDisk);
    }

    worlds.forEach(function(world) {
        var l, isL, lLoc;
        try {
            l = fs.lstatSync(path.join(bin, world));
            isL = l.isSymbolicLink();
            lLoc = fs.readlinkSync(path.join(bin, world));
        } catch(e) {}

        //if is a link or file doesn't exist
        if(isL || !l) {
            if(ramWorlds.indexOf(world) != -1) {
                //create worldram location
                wrench.mkdirSyncRecursive(path.join(worldRam, world));
                if(lLoc != path.join(worldRam, world)) {
                    //ensure lLoc points to ram location
                    try {
                        if(l) fs.unlinkSync(path.join(bin, world));
                        fs.symlinkSync(path.join(worldRam, world), path.join(bin, world));
                        log('Created ram symlink for ' + world, 'debug');
                    } catch(e) {
                        log('Failed to create ram symlink for ' + world + '. Got error: ' + e, 'error');
                        allGood = false;
                    }
                }
            } else {
                //create disk location
                wrench.mkdirSyncRecursive(path.join(worldDisk, world));
                if(lLoc != path.join(worldDisk, world)) {
                    //ensure lLoc points to disk location
                    try {
                        if(l) fs.unlinkSync(path.join(bin, world));
                        fs.symlinkSync(path.join(worldDisk, world), path.join(bin, world));
                        log('Created ram symlink for ' + world, 'debug');
                    } catch(e) {
                        log('Failed to create disk symlink for ' + world + '. Got error: ' + e, 'error');
                        allGood = false;
                    }
                }
            }
        } else {
            log('Failed to process links for ' + world + ' please move all worlds to ' + worldDisk, 'error');
            allGood = false;
        }
    });

    return allGood;
};

/*Minecraft.prototype.toggleSaves = function(on, emit) {
  if(on) {
  this.cmd('save-on', emit);
  } else {
  this.cmd('save-off', false);
  this.cmd('save-all', emit);
  }
  };*/

Minecraft.prototype._worldsToRam = function() {
    var self = this,
    worldRam = self._settings.paths.worldRam,
    worldDisk = self._settings.paths.worldDisk,
    ramWorlds = self._settings.ramWorlds,
    worlds = self._settings.worlds;

    worlds.forEach(function(world) {
        if(ramWorlds.indexOf(world) != -1) {
            wrench.copyDirSyncRecursive(path.join(worldDisk, world), path.join(worldRam, world));
        }
    });
};

Minecraft.prototype._worldsToDisk = function() {
    var self = this,
    worldRam = self._settings.paths.worldRam,
    worldDisk = self._settings.paths.worldDisk,
    ramWorlds = self._settings.ramWorlds,
    worlds = self._settings.worlds;

    //self.savesToggle(false, false);

    worlds.forEach(function(world) {
        if(ramWorlds.indexOf (world) != -1) {
            wrench.copyDirSyncRecursive(path.join(worldRam, world), path.join(worldDisk, world));
            wrench.rmdirSyncRecursive(path.join(worldRam, world), true);
        }
    });

    //self.savesToggle(true, false);
};