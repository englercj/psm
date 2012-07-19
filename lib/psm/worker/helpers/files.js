var utile = require('utile'),
events = require('events'),
cp = require('child_process'),
async = utile.async,
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
    self.server = options.server;

    self.paths = options.server.paths;
    self.backup = options.server.backup;
    self.worlds = options.server.worlds;
    self.ramWorlds = options.server.ramWorlds;

    self._defineGetters();
    self._defineSetters();

    self._setupBackupCrons();
};

utile.inherits(FileManager, events.EventEmitter);

FileManager.prototype.read = function(file, encoding, cb) {
    var self = this;

    if(typeof(encoding) == 'function') {
	cb = encoding;
	encoding = 'utf8';
    }

    encoding = encoding || 'utf8';

    fs.readFile(file, encoding, cb);
};

FileManager.prototype.rm = function(file, cb) {
    var self = this;

    fs.unlink(file, cb);
};

FileManager.prototype.rmdir = function(dir, cb) {
    var self = this;

    utile.rimraf(dir, cb);
};

FileManager.prototype.write = function(file, data, type, cb) {
    var self = this,
    encoding = 'utf8';

    if(typeof(type) == 'function') {
	cb = type;
	type = 'json';
    }

    type = type || 'json';

    switch(type) {
    case 'yaml': //TODO, yaml encoding
    case 'json': data = JSON.stringify(data); break;
    case 'text': break; //don't encode data, and use default utf8
    case 'binary': ecoding = 'binary'; break;
    }

    fs.writeFile(file, data, encoding, cb);
};

FileManager.prototype.list = function(dir, cb) {
    var self = this;

    fs.readdir(dir, cb);
};

FileManager.prototype.listFiles = function(dir, match, cb) {
    var self = this,
    list;

    if(typeof(match) == 'function') {
	cb = match;
	match = null;
    }

    self.list(dir, function(err, files) {
	if(err) { if(cb) cb(err); return; }

	list = files.filter(function(file, i) {
	    var f = fs.statSync(path.join(dir, file)),
	    pass = (f.isFile() && (match ? match.test(file) : true));

	    return pass;
	});

	if(cb) cb(null, list);
    });
};

FileManager.prototype.listDirs = function(dir, match, cb) {
    var self = this,
    list;

    if(typeof(match) == 'function') {
	cb = match;
	match = null;
    }

    self.list(dir, function(err, files) {
	if(err) { if(cb) cb(err); return; }

	list = files.filter(function(file, i) {
	    var f = fs.statSync(path.join(dir, file)),
	    pass = (f.isDirectory() && (match ? match.test(file) : true));

	    return pass;
	});

	if(cb) cb(null, list);
    });
};

FileManager.prototype._datePath = function(p, ext, forceTime) {
    var self = this,
    d = (new Date()),
    date = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(),
    time = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds(),
    path = p + date + ext,
    test;

    ext = ext || '';

    try {
        test = fs.statSync(path);
    } catch(e) {}

    if((test || forceTime) && forceTime !== false)
        path = p + date + 'T' + time + ext;

    return path;
};

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
                if(stdout.length === 0) { //the same
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

FileManager.prototype._defineGetters = function() {
    var self = this;

    self.__defineGetter__('properties', function() {
	if(!self._props) {
	    try {
		self._props = {};
		var lines = fs.readFileSync(path.join(self.paths.bin, 'server.properties'), 'utf8').split('\n');

		lines.forEach(function(line) {
		    if(line.charAt(0) == '#') return;

		    var val = line.split('=');
		    self._props[val[0]] = val[1];
		});
	    } catch(e) { self._props = null; }
	}

	return self._props;
    });
};

FileManager.prototype._defineSetters = function() {

};