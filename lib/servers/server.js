/**
 * Server module, base server class that all servers inherit
**/

var fs = require('fs'),
path = require('path'),
spawn = require('child_process').spawn,
util = require('util'),
events = require('events'),
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