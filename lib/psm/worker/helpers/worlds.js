var utile = require('utile'),
events = require('events'),
cp = require('child_process'),
path = require('path'),
request = require('request'),
Job = require('./job').Job;

var WorldManager = exports.WorldManager = function(options) {
    var self = this;
    events.EventEmitter.call(self);
    options = options || {};

    self.log = options.logger;
    self.worker = options.worker;
    self.server = options.server;

    self.paths = options.server.paths;

    self._defineGetters();
    self._defineSetters();
};

utile.inherits(WorldManager, events.EventEmitter);

WorldManager.prototype.get = function(world, cb) {
    var self = this;

    if(world) {
	//TODO: Get specific info on a world
	cb(new Error('Not yet implemented.'));
    } else {
	//TODO: add regex/func to filter for only real worlds?
	//check for level.dat inside folder if it is a real world?
	self.worker.files.listDirs(self.paths.worldDisk, cb);
    }
};

WorldManager.prototype.backup = function(w, cb) {
    var self = this,
    worlds = ['world', 'world_nether', 'world_the_end'],
    errors = [],
    cmds = [];

    if(typeof(w) == 'function') {
	cb = w;
	w = null;
    }

    //ensure backup path exists
    utile.mkdirp(self.backup.maps.path, function(err) {
        if(err) { if(cb) cb(err); return; }

	//setup commands
	if(w) {
	    cmds.push(self._buildBackupCommand(w));
	} else {
            worlds.forEach(function(world) {
		cmds.push(self._buildBackupCommand(world));
	    });
        });

	//run each async
	async.parallel(cmds, function(err, results) {
	    if(err) errors.push(err);

	    if(results) { //all done
		if(cb) cb(errors.length ? errors : null);
	    }
	});
    });
};

WorldManager.prototype.restore = function(world, file, cb) {
    var self = this;
};

WorldManager.prototype.toDisk = function(cb) {
    var self = this,
    worldRam = self.paths.worldRam,
    worldDisk = self.paths.worldDisk,
    ramWorlds = self.ramWorlds,
    worlds = self.worlds,
    cmds = [],
    errors = [];

    if(worlds.length === 0) {
        if(cb) cb();
        return;
    }

    //self.savesToggle(false);
    
    //setup each copy command
    worlds.forEach(function(world) {
        if(ramWorlds.indexOf(world) != -1) {
	    cmds.push(function(next) {
		utile.cpr(path.join(worldRam, world), path.join(worldDisk, world), next);
	    });
	}
    });

    //run each in parallel
    async.parallel(cmds, function(err, results) {
        if(err) errors.push(err);

	if(results) { //all done
	    if(cb) cb(errors.length ? errors : null);
	}
    });

    /*
    utile.rimraf(path.join(worldRam, world), function(err) {
        if(err) errors.push(err);
	
        done++;
        if(done == worlds.length) {
            if(errors.length && cb) cb(errors);
            else if(cb) cb(null);
        }
    });
    */

    //self.savesToggle(true);
};

WorldManager.prototype.toRam = function(cb) {
    var self = this,
    worldRam = self.paths.worldRam,
    worldDisk = self.paths.worldDisk,
    ramWorlds = self.ramWorlds,
    worlds = self.worlds,
    cmds = [],
    errors = [];

    if(worlds.length === 0) {
        if(cb) cb();
        return;
    }

    //setup copy commands
    worlds.forEach(function(world) {
        if(ramWorlds.indexOf(world) != -1) {
	    cmds.push(function(next) {
		utile.cpr(path.join(worldDisk, world), path.join(worldRam, world), next);
	    });
	}
    });

    //run each in parallel
    async.parallel(cmds, function(err, results) {
        if(err) errors.push(err);

	if(results) { //all done
	    if(cb) cb(errors.length ? errors : null);
	}
    });
};

WorldManager.prototype.checkLinks = function(cb) {
    var self = this,
    bin = self.paths.bin,
    worldRam = self.paths.worldRam,
    worldDisk = self.paths.worldDisk,
    ramWorlds = self.ramWorlds,
    worlds = self.worlds,
    cmds = [],
    errors = [];

    //only need links if we store worlds somewhere
    //other than the main mc folder
    if(bin == worldDisk || worlds.length === 0) { if(cb) cb(); return; }

    self.log.debug('Ensuring world disk location exists');
    utile.mkdirp(worldDisk, function(err) {
        self.log.silly('iterating through each world');
	async.forEach(worlds, function(world, next) {
            self.log.silly('Checking links for world: %s', world);
            self._checkWorldLink(world, function(err) {
                if(err) errors.push(err);

                self.log.silly('Links checked for world: %s', world);
		next();
            });
        }, function(err) {
	    if(cb) cb(errors.length ? errors : null);
	});
    });
};

WorldManager.prototype._checkLink = function(world, cb) {
    var self = this,
    l, isL, lLoc,
    bin = self.paths.bin,
    worldRam = self.paths.worldRam,
    worldDisk = self.paths.worldDisk,
    ramWorlds = self.ramWorlds;

    try {
        l = fs.lstatSync(path.join(bin, world));
        isL = l.isSymbolicLink();
        lLoc = fs.readlinkSync(path.join(bin, world));
    } catch(e) {}

    //if is a link or doesn't exist
    self.log.silly('Checking link for world: %s, isSymlink: %s, exists: %s', world, !!isL, !!l);
    if(isL || !l) {
        if(ramWorlds.indexOf(world) != -1) {
            //create the worldram location
            self.log.silly('Creating worldRam location for %s', world);
            self._doCreateLoc(worldRam, world, l, lLoc, function(err) {
                if(cb) cb(err);
            });
        } else {
            //create disk location
            self.log.silly('Creating worldDisk location for %s', world);
            self._doCreateLoc(worldDisk, world, l, lLoc, function(err) {
                if(cb) cb(err);
            });
        }
    } else {
        //this is a real world-folder, lets move it to worldstorage
        self.log.info('Moving %s files to world disk location', world);
        utile.cpr(path.join(bin, world), path.join(worldDisk, world), function(err) {
            if(err) { if(cb) cb(err); return; }

            //now that we moved it lets check again
            self._checkWorldLink(world, cb);
        });
    }
};

WorldManager.prototype._doCreateLoc = function(p, world, l, lLoc, cb) {
    var self = this,
    bin = self.paths.bin,
    worldLoc = path.join(p, world);

    utile.mkdirp(worldLoc, function(err) {
        //ensure lLoc points to world location
        if(lLoc != worldLoc) {
            fs.unlink(path.join(bin, world), function(err) {
                if(err && err.code != 'ENOENT') {
                    if(cb) cb(err);
                    return;
                }

                self.log.debug('Creating symlink for %s at %s', world, worldLoc);
                fs.symlink(worldLoc, path.join(bin, world), function(err) {
                    if(err) { if(cb) cb(err); return; }

                    self.log.debug('Created symlink for %s at %s', world, worldLoc);
                    if(cb) cb(null);
                });
            });
        } else {
            self.log.debug('Link location already points to where it should');
            if(cb) cb(null);
        }
    });
};

WorldManager.prototype._buildBackupCommand = function(world) {
    var to = self.worker.files._datePath(path.join(self.backup.maps.path, world + '_'), '.tar.gz2'),
    from = path.join(self.paths.worldDisk, world);

    return (function(to, from) {
	return function(next) {
	    self.log.info('Backing up ' + world + ' to ' + dname + '...');
	    cp.exec('tar -hcjf ' + to + ' ' + from, function(err, stdout, stderr) {
		if(err !== null) {
		    self.log.error(err, 'Error taring backup for %s', world);
		}
		
		next(err, { stdout: stdout, stderr: stderr });
	    });
	};
    })(to, from);
};

WorldManager.prototype._defineGetters = function() {
    var self = this;

    //self.__defineGetter__('something', function() {});
};

WorldManager.prototype._defineSetters = function() {
    var self = this;

    //self.__defineSetter__('something', function(val) {});
};
