var utile = require('utile'),
events = require('events'),
cp = require('child_process'),
fs = require('fs'),
path = require('path'),
conJob = require('cron').CronJob,
request = require('request');

var FileManager = exports.FileManager = function(options) {
    var self = this;
    events.EventEmitter.call(self);
    options = options || {};

    self.log = options.logger;
    self.worker = options.worker;
    self.paths = options.paths;
    self.backup = options.backup;
    self.worlds = options.worlds;
    self.ramWorlds = options.ramWorlds;

    self._setupBackupCrons();
};

utile.inherits(FileManager, events.EventEmitter);

FileManager.prototype.update = function(cb) {
    var self = this,
    done = 0,
    updates = 2,
    errors = [];

    self._updateFile(
        'minecraft_server.jar',
        'https://s3.amazonaws.com/MinecraftDownload/launcher/minecraft_server.jar',
        function(err, updated) {
            if(!err) {
                if(updated) {
                    self.log.info('Minecraft Server successfully updated.');
                } else {
                    self.log.info('Minecraft Server is already at the latest version.');
                }
            }

            updateDone(err, updated);
        }
    );

    self._updateFile(
        'craftbukkit.jar',
        'http://dl.bukkit.org/latest-rb/craftbukkit.jar', //Latest RB
        //'http://dl.bukkit.org/latest-dev/craftbukkit.jar', //Latest Dev
        function(err, updated) {
            if(!err) {
                if(updated) {
                    self.log.info('Craftbukkit successfully updated.');
                } else {
                    self.log.info('Craftbukkit is already at the latest version.');
                }
            }

            updateDone(err, updated);
        }
    );

    function updateDone(err, updated) {
        if(err) errors.push(err);

        done++;
        if(done == updates) {
            if(errors.length && cb) cb(errors);
            else if(cb) cb(null);
        }
    }

    //TODO: Check for craftbukkit files and update those
};

FileManager.prototype.backupMaps = function(cb) {
    var self = this;

    if(!self.backup || !self.backup.maps || !self.backup.maps.enabled) {
        if(cb) cb(new Error('Map backups are disabled'));
        return;
    }

    var worldDisk = self.paths.worldDisk,
    worlds = self.backup.worlds,
    bak = self.backup.maps.path,
    done = 0;

    if(!worlds) {
        if(cb) cb(new Error('No worlds are listed for backups'));
        return;
    }

    if(self.backup.maps.startMsg) {
        self.worker.cmd(['say', self.backup.maps.startMsg]);
    }

    //ensure backup path exists
    utile.mkdirp(bak, function(err) {
        if(err) { if(cb) cb(err); return; }

        worlds.forEach(function(world) {
            dname = self._datePath(path.join(bak, world + '_'), '.tar.gz2');

            self.log.info('Backing up ' + world + ' to ' + dname + '...');

            cp.exec('tar -hcjf ' + dname + ' ' + path.join(worldDisk, world), function(err, stdout, stderr) {
                if(err !== null) {
                    self.log.error('Error taring backup for ' + world, err);
                }

                done++;
                if(done == worlds.length) {
                    if(self.backup.maps.doneMsg) self.worker.cmd(['say', self.backup.maps.doneMsg]);

                    if(cb) cb(null);
                }
            });
        });
    });
};

FileManager.prototype.backupServer = function(cb) {
    var self = this;

    if(!self.backup || !self.backup.server || !self.backup.server.enabled) {
        if(cb) cb(new Error('Server backups are disabled'));
        return;
    }

    var bin = self.paths.bin,
    bak = self.backup.server.path,
    dname = self._datePath(path.join(bak, 'server_'));

    self.log.info('Backing up server bin to ' + dname);

    utile.mkdirp(dname, function(err) {
        if(err) { if(cb) cb(err); return; }

        utile.cpr(bin, dname, function(err) {
            if(err) { if(cb) cb(err); return; }

            if(cb) cb(null);
        });
    });
};

FileManager.prototype.backupLogs = function(cb) {
    var self = this;

    if(!self.backup || !self.backup.logs || !self.backup.logs.enabled) {
        if(cb) cb(new Error('Log backups are disabled'));
        return;
    }

    if(self.worker.isRunning()) {
        if(self.backup.logs.startMsg) self.worker.cmd(['say', self.backup.logs.startMsg]);

        setTimeout(function() {
            self.worker.stop(function(err) {
                if(err) {
                    self.log.error('Unable to stop server for log backups', err);
                    if(cb) cb(err);
                    return;
                }

                self._doLogBackup(cb);
            });
        });
    } else {
        self._doLogBackup(cb);
    }
};

FileManager.prototype.worldsToDisk = function(cb) {
    var self = this,
    worldRam = self.paths.worldRam,
    worldDisk = self.paths.worldDisk,
    ramWorlds = self.ramWorlds,
    worlds = self.worlds,
    done = 0,
    errors = [];

    if(worlds.length == 0) {
        if(cb) cb(null);
        return;
    }

    //self.savesToggle(false);

    worlds.forEach(function(world) {
        if(ramWorlds.indexOf(world) != -1) {
            utile.cpr(path.join(worldRam, work), path.join(worldDisk, world), function(err) {
                if(err) {
                    errors.push(err);

                    done++;
                    if(done == worlds.length) {
                        if(errors.length && cb) cb(errors);
                        else if(cb) cb(null);
                    }
                } else {
                    utile.rimraf(path.join(worldRam, world), function(err) {
                        if(err) errors.push(err);

                        done++;
                        if(done == worlds.length) {
                            if(errors.length && cb) cb(errors);
                            else if(cb) cb(null);
                        }
                    });
                }
            });
        } else done++;
    });

    //self.savesToggle(true);
};

FileManager.prototype.worldsToRam = function(cb) {
    var self = this,
    worldRam = self.paths.worldRam,
    worldDisk = self.paths.worldDisk,
    ramWorlds = self.ramWorlds,
    worlds = self.worlds,
    done = 0,
    errors = [];

    if(worlds.length == 0) {
        if(cb) cb(null);
        return;
    }

    worlds.forEach(function(world) {
        if(ramWorlds.indexOf(world) != -1) {
            utile.cpr(path.join(worldDisk, world), path.join(worldRam, world), function(err) {
                if(err) errors.push(err);

                done++;
                if(done == worlds.length) {
                    if(errors.length && cb) cb(errors);
                    else if(cb) cb(null);
                }
            });
        } else done++;
    });
};

FileManager.prototype.checkWorldLinks = function(cb) {
    var self = this,
    bin = self.paths.bin,
    worldRam = self.paths.worldRam,
    worldDisk = self.paths.worldDisk,
    ramWorlds = self.ramWorlds,
    worlds = self.worlds,
    done = 0,
    errors = [];

    //only need links if we store worlds somewhere
    //other than the main mc folder
    if(bin == worldDisk || worlds.length == 0) { if(cb) cb(null); return; }

    self.log.silly('Ensuring world disk location exists');
    utile.mkdirp(worldDisk, function(err) {
        self.log.silly('iterating through each world');
        worlds.forEach(function(world) {
            self.log.silly('Checking links for world: %s', world);
            self._checkWorldLink(world, function(err) {
                if(err) errors.push(err);

                self.log.silly('Links checked for world: %s, done: %d', world, done + 1);
                done++;
                if(done == worlds.length) {
                    if(errors.length && cb) cb(errors);
                    else if(cb) cb(null);
                }
            });
        });
    });
};

FileManager.prototype._checkWorldLink = function(world, cb) {
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

FileManager.prototype._doCreateLoc = function(p, world, l, lLoc, cb) {
    var self = this,
    worldLoc = path.join(p, world);

    utile.mkdirp(worldLoc, function(err) {
        //ensure lLoc points to world location
        if(lLoc != worldLoc) {
            fs.unlink(path.join(self.bin, world), function(err) {
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

FileManager.prototype._setupBackupCrons = function() {
    var self = this;

    utile.each(self.backup, function(bak, name) {
        if(bak.enabled && bak.interval) {
            try {
                bak.cron = new cronJob(bak.interval, function() {
                    var backing = utile.captialize(name);

                    if(self['backup' + backing])
                        self['backup' + backing]();
                }, null, true);
            } catch(e) {
                self.log.error('Backup interval for ' + name + ' is invalid.', e);
            }
        }
    });
};

FileManager.prototype._doLogBackup = function(cb) {
    var self = this,
    logP = self.paths.log,
    bak = self.backup.logs.path,
    fname = self._datePath(path.join(bak, 'serverlog_'), '.log');

    self.log.info('Backing up server.log to ' + fname + '...');

    utile.mkdirp(bak, function(err) {
        if(err) { if(cb) cb(err); return; }

        fs.rename(logP, fname, function(err) {
            if(err) {
                if(err.code == 'ENOENT') {
                    self.log.info('No server.log to backup.');
                }

                self.worker.start(function() {
                    if(cb) cb(err);
                });
                return;
            }

            self.log.info('Gzipping backed up logfile...');
            cp.exec('gzip ' + fname, function(err, stdout, stderr) {
                if(err) {
                    self.log.error('Error gzippping backup logfile ' + fname, err);
                }

                self.worker.start(function() {
                    if(cb) cb(err);
                });
            });
        });
    });
};

FileManager.prototype._datePath = function(p, ext, forceTime) {
    var self = this,
    d = (new Date()),
    date = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(),
    time = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds(),
    ext = ext || '',
    path = p + date + ext,
    test;

    try {
        test = fs.statSync(path);
    } catch(e) {}

    if((test || forceTime) && forceTime !== false)
        path = p + date + 'T' + time + ext;

    return path;
}

FileManager.prototype._updateFile = function(file, uri, cb) {
    var self = this,
    bin = self.paths.bin,
    fileNew = file + '.new',
    //mult = multimeter(process),
    size = 0,
    seen = 0,
    bar = null;

    if(self.isRunning()) {
        if(cb) cb(new Error('Cannot update ' + file + ' while the server is running.'));
        return;
    }

    self.log.debug('Downloading updated ' + file + '...');
    var req = request(uri, function() {
        var f;
        try { f = fs.lstatSync(path.join(bin, fileNew)); }
        catch(e) {}

        if(f) {
            cp.exec('diff ' + path.join(bin, file) + ' ' + path.join(bin, fileNew), function(err, stdout, stderr) {
                if(stdout.length == 0) { //the same
                    fs.unlink(path.join(bin, fileNew), function(err) {
                        if(cb) cb(err, false);
                    });
                } else { //dled new version
                    fs.unlink(path.join(bin, file), function(err) {
                        if(err) { if(cb) cb(err); return; }

                        fs.rename(path.join(bin, fileNew), path.join(bin, file), function(err) {
                            if(cb) cb(err, true);
                        });
                    });
                }
            });
        } else {
            if(cb) cb(new Error('The file failed to download, unable to find new file ' + fileNew));
        }
    });

    req.on('response', function(res) {
        if(res.headers['content-length']) {
            size = res.headers['content-length'];
        }
    });

    res.on('data', function(chunk) {
        seen += chunk.length;
        self.emit('update::progress::' + file, seen/size * 100);
        //if(bar) bar.percent(seen / size * 100);
    });

    res.pipe(fs.createWriteStream(path.join(bin, fileNew)));

    /*
      mult.drop({
      solid: {
      background: null,
      foreground: 'green',
      text: '|'
      }
      }, function(b) { bar = b; });
    */
};