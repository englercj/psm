/**
 * Server module, base server class that all servers inherit
**/

var fs = require('fs'),
path = require('path'),
spawn = require('child_process').spawn,
util = require('util'),
events = require('events'),
exec = require('child_process').exec,
request = require('request'),
multimeter = require('multimeter'),
wrench = require('wrench'),
cronJob = require('cron').CronJob,
config = require('../../config/config.json'),
utils = require('../utils'),
log = require('../logger').log;

var Server = exports.Server = function(options) {
    var self = this;
    events.EventEmitter.call(self);

    self._server = null;
    self._settings = options;

    self._startup = {
	args: [],
	cwd: process.cwd()
    };

    self._starting = false;
    self._stopping = false;
    self._isIdle = false;
    self._idle = {};

    self._outputBuff = [];
    self._outputBuffMax = 10;

    //setup backup intervals
    for(var bk in self._settings.backups) {
	if(self._settings.backups.hasOwnProperty(bk)) {
	    var bak = self._settings.backups[bk];

	    if(bak.enabled && bak.interval) {
		try {
		    //throw up a closure to take a snapshot of bak & bk
		    (function(bak, bk) {
			bak.cron = new cronJob(bak.interval, function() {
			    var backing = '';
			    if(bk != 'server')
				backing = (bk.charAt(0).toUpperCase() + bk.slice(1).toLowerCase());
			    
			    if(self['backup' + backing]) self['backup' + backing](false);
			}, null, true);
		    })(bak, bk);
		} catch(e) {
		    log('Backup interval for ' + bk + ' is invalid!', 'error');
		    log('Got error: ' + e, 'error');
		}
	    }
	}
    }
    

    self.on('startup::done', function() {
	self._starting = false;
	clearTimeout(self._idle);
    });

    self.on('shutdown::done', function() {
	log(self._settings.name + ' has stopped.', 'info');

	if(self._starting) //failed to start
	    self._cmdDone();

	self._starting = false;
        self._stopping = false;
        self._server = null;
	clearTimeout(self._idle);
    });

    self.on('server::idle', function() {
	var doing = (self._starting ? 'starting' : (self._stopping ? 'stopping' : 'executing cmd'));
	if(self._starting || self._stopping) {
	    log(self._settings.name + ' went idle while ' + doing + '!', 'error');
	    log('Killing idle server...', 'error');
	    self._server.kill();

	    log('Output Buffer dump of last ' + self._outputBuffMax + ' lines:', 'debug');
	    self._outputBuff.forEach(function(line) {
		log(line, 'debug');
	    });
	}
    });
};

//Server inherits from EventEmitter
util.inherits(Server, events.EventEmitter);

Server.prototype.isRunning = function() { 
    return !!this._server; 
};

Server.prototype.cmd = function(args, emit) {
    var cmd;
    if(args instanceof Array)
	cmd = args.join(' ');
    else
	cmd = args;

    if(!this.isRunning()) {
	log(this._settings.name + ' is not running!', 'info');
	this._cmdDone(emit);
	return false;
    } else {
	this._server.stdin.write(cmd + '\n');
	this._cmdDone(emit);
	return true;
    }
};

//Public methods
Server.prototype.start = function(emit) {
    var self = this;

    if(self.isRunning()) {
	log(self._settings.name + ' is already running!', 'info');
	this._cmdDone(emit);
	return false;
    } else if(self._startup.cmd) {
	self._server = spawn(self._startup.cmd, self._startup.args, { cwd: self._startup.cwd });
	self._resetIdle();
	self._starting = true;

	self._server.on('exit', function(code) {
	    self.emit('shutdown::done', code);
	});

	self._server.stdout.on('data', function(data) {
	    var str = data.toString();

	    self._outputBuff.push(str);
            if(self._outputBuff.length > self._outputBuffMax)
		self._outputBuff.shift();

	    if(self._starting || self._stopping)
		self._resetIdle();
	    
	    self.emit('stdout', str);
	});

	self._server.stderr.on('data', function(data) {
	    var str = data.toString();

	    self._outputBuff.push(str);
            if(self._outputBuff.length > self._outputBuffMax)
		self._outputBuff.shift();

	    if(self._starting || self._stopping)
		self._resetIdle();

	    self.emit('stderr', str);
	});

	log('Server is starting up...', 'info');
	self.once('startup::done', function() {
	    self._cmdDone(emit);
	});

	return true;
    }
};

Server.prototype.stop = function(emit) {
    var self = this;
    
    if(self.isRunning()) {
	log('Stopping server..', 'info');
	self.once('shutdown::done', function() {
	    self._cmdDone(emit);
	});
	self._resetIdle();
	self._stopping = true;

	process.kill();

	return true;
    }

    log(self._settings.name + ' is not running', 'info');
    self._cmdDone(emit);
    return false;
};

Server.prototype.restart = function(emit) {
    var self = this;
    
    var succ = self.stop(false);
    if(succ) {
	self.once('shutdown::done', function() {
	    self.start(emit);
	});
    } else {
	self.start(emit);
    }
};

Server.prototype.status = function(emit) {
    var stats = {
	up: this.isRunning()
    };

    this._cmdDone(emit, stats);
    return stats;
};

Server.prototype.update = function() {};

Server.prototype.backup = function(emit) {
    if(!this._settings.backups || !this._settings.backups.server || !this._settings.backups.server.enabled) {
	this._cmdDone(emit, false);
	return false;
    }

    var self = this,
    bin = self._settings.paths.bin,
    bak = self._settings.backups.server.path,
    dname = utils.datepath(path.join(bak, 'server_'));

    log('Backing up server bin to ' + dname + '...', 'info');
    log('This may take a while...', 'info');

    wrench.mkdirSyncRecursive(dname);
    wrench.copyDirSyncRecursive(bin, dname);

    self._cmdDone(emit);
};

Server.prototype._resetIdle = function() {
    var self = this;
    if(self._settings.idleTime) {
	clearTimeout(self._idle);
	self._isIdle = false;
	self._idle = setTimeout(function() {
	    self._isIdle = true;
	    self.emit('server::idle');
	}, self._settings.idleTime);
    }
};

Server.prototype._cmdDone = function(emit, data) {
    if(emit !== false) {
	this.emit('cmd::done', data);
    }
};

/*Server.prototype._reattach = function(pid) {
    var self = this,
    proc = process;

    //when spawning if stdinStream, stdoutStream, or stderrStream are
    //defined in the options, it should just open a socket to them
    //the problem is that it would actually do the spawning of a new
    //proc if I call spawn...
    //self._server = spawn(self._startup.cmd, self._startup.args, { cwd: self._startup.cwd });
    self.server = spawn({

    });
};*/

Server.prototype._updateFile = function(file, uri, callback) {
    var self = this,
    bin = self._settings.paths.bin,
    //jar = self._settings.jar,
    fileNew = file + '.new',
    exec = require('child_process').exec,
    mult = multimeter(process),
    size = 0,
    seen = 0,
    bar = null;

    if(self.isRunning()) {
	callback('ERUNNING');
	return false;
    }

    log('Downloading updated ' + file + '...', 'info');
    var req = request(uri, function() {
	var f;
	try { f = fs.lstatSync(path.join(bin, fileNew)); }
	catch(e) {}

	if(f) {
	    exec('diff ' + path.join(bin, file) + ' ' + path.join(bin, fileNew), function(err, stdout, stderr) {
		if(stdout.length == 0) { //the same
		    fs.unlinkSync(path.join(bin, fileNew));
		    callback('ESAME');
		} else { //dled new version
		    fs.unlinkSync(path.join(bin, file));
		    fs.renameSync(path.join(bin, fileNew), path.join(bin, file));
		    callback();
		}
	    });
	} else {
	    callback('EDOWNLOAD');
	}
    })
	.on('response', function(res) {
	    if(res.headers['content-length']) {
		size = res.headers['content-length'];
	    }
	})
	.on('data', function(chunk) {
	    seen += chunk.length;
	    if(bar) bar.percent(seen / size * 100);
	})
	.pipe(fs.createWriteStream(path.join(bin, fileNew)));

    mult.drop({
	solid: {
	    background: null,
	    foreground: config.colors.bar,
	    text: '|'
	}
    }, function(b) { bar = b; });
};