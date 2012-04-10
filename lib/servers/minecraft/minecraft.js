/**
 * Minecraft server class for controlling minecraft servers
**/
var Server = require('../server').Server,
path = require('path'),
spawn = require('child_process').spawn,
util = require('util');

var Minecraft = exports.Minecraft = function(options) {
    this.cmd = 'java';
    this.args = [
	'-Xmx' + this.settings.maxMem,
	'-Xms' + this.settings.initMem, 
	'-XX:+UseConcMarkSweepGC',
	'-XX:+CMSIncrementalPacing',
	'-XX:ParallelGCThreads=' + this.settings.cpus, 
	'-XX:+AggressiveOpts',
	'-jar',
	path.join(this.settings.bin, this.settings.jar),
	'nogui'
    ];

    this.players = [];
};

//Minecraft inherits from Server class
util.inherits(Minecraft, Server);

//Uncomment to override:
//Minecraft.prototype.start = function() {};
//Minecraft.prototype.runCmd = function() {};
//Server.prototype.onStderr = function(data) {};
//Server.prototype.onExit = function(code) {};

//Public methods overriding base Server
Minecraft.prototype.stop = function() {
    if(this.isRunning()) {
	this.runCmd('stop\n');
	return true;
    }

    log('Server is not running', 'info');
    return false;
};

Minecraft.prototype.restart = function() {
    this.stop();
    setTimeout(this.start, 500);
};

Minecraft.prototype.status = function() {};
Minecraft.prototype.update = function() {};

//Events
Minecraft.prototype.onStdout = function(data) {
    //player connect
    var tmp = data.match(/\[INFO\] ([^\s]+) .* logged in /),
    name = tmp ? tmp[1] : null;

    if(name && this.players.indexOf(name) === -1)
	this.players.push(name);

    //player disconnect
    var i, player, tmp = data.match(/\[INFO\] ([^\s]+) lost connection/);

    if(tmp) {
	player = tmp[1];
	i = players.indexOf(player);
	if(i !== -1)
	    players.splice(i, 1);
    }
};