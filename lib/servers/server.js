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

    self.server = null;
    self.startup = {};
    self.startup.args = [];
    self.startup.cwd = process.cwd();

    self.settings = options;
};

//Server inherits from EventEmitter
util.inherits(Server, events.EventEmitter);

Server.prototype.isRunning = function() { 
    return !!this.server; 
};

Server.prototype.cmd = function(args, emit) {
    var cmd;
    if(args instanceof Array)
	cmd = args.join(' ');
    else
	cmd = args;

    if(!this.isRunning()) {
	log(this.settings.name + ' is not running!', 'info');
	this._cmdDone(emit);
	return false;
    } else {
	this.server.stdin.write(cmd + '\n');
	this._cmdDone(emit);
	return true;
    }
};

//Public methods
Server.prototype.start = function(emit) {
    var self = this;

    if(self.isRunning()) {
	log(self.settings.name + ' is already running!', 'info');
	this._cmdDone(emit);
	return false;
    } else if(self.startup.cmd) {
	self.server = spawn(self.startup.cmd, self.startup.args, { cwd: self.startup.cwd });

	self.server.on('exit', function(code) {
	    self.emit('shutdown::done', code);
	});
	self.server.stdout.on('data', function(data) {
	    self.emit('stdout', data);
	});
	self.server.stderr.on('data', function(data) {
	    self.emit('stderr', data);
	});

	log('Server is starting up...', 'info');
	self.on('startup::done', function() {
	    self._cmdDone(emit);
	});

	return true;
    }
};

Server.prototype.stop = function() {};
Server.prototype.restart = function() {};

Server.prototype.status = function() {};
Server.prototype.update = function() {};

Server.prototype._cmdDone = function(emit) {
    if(emit !== false) {
	this.emit('cmd::done');
    }
};