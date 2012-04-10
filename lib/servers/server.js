/**
 * Server module, base server class that all servers inherit
**/

var fs = require('fs'),
path = require('path'),
spawn = require('child_process').spawn;

var Server = exports.Server = function(options) {
    this.server = null;

    this.settings = options;
};

Server.prototype.isRunning = function() { return !!this.server; }
Server.prototype.runCmd = function(cmd) {
    if(!this.isRunning()) {
	log(this.settings.name + ' is not running!', 'error');
	return false;
    } else {
	this.server.stdin.write(cmd);
	return true;
    }
};

//Public methods
Server.prototype.start = function() {
    if(this.isRunning()) {
	log(this.settings.name + ' is already running!', 'info');
	return false;
    } else {
	this.server = spawn(this.cmd, this.args);

	this.server.on('exit', this.onExit);
	this.server.stdout.on('data', this.onStdout);
	this.server.stderr.on('data', this.onStderr);

	return true;
    }
};
Server.prototype.stop = function() {};
Server.prototype.restart = function() {};

Server.prototype.status = function() {};
Server.prototype.update = function() {};

//Events
Server.prototype.onStdout = function(data) {};
Server.prototype.onStderr = function(data) {
    log(this.settings.name + ' error: ' + data, 'error');
};
Server.prototype.onExit = function(code) {};