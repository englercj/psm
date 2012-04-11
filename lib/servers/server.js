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
    self._startup = {};
    self._startup.args = [];
    self._startup.cwd = process.cwd();

    self._settings = options;
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
	log(this.settings.name + ' is not running!', 'info');
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

	self._server.on('exit', function(code) {
	    self.emit('shutdown::done', code);
	});
	self._server.stdout.on('data', function(data) {
	    self.emit('stdout', data);
	});
	self._server.stderr.on('data', function(data) {
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

Server.prototype.status = function(emit) {
    var stats = {
	up: this.isRunning()
    };

    this._cmdDone(emit, stats);
    return stats;
};

Server.prototype.update = function() {};

Server.prototype._cmdDone = function(emit, data) {
    if(emit !== false) {
	this.emit('cmd::done', data);
    }
};