/**
 * Minecraft server class for controlling minecraft servers
 **/
var Server = require('../server').Server,
path = require('path'),
spawn = require('child_process').spawn,
util = require('util'),
log = require('../../logger').log;

var Minecraft = exports.Minecraft = function(options) {
    var self = this;
    Server.call(self, options);

    self.startup.cmd = 'java';
    self.startup.args = [
        '-Xmx' + self.settings.maxMem,
        '-Xms' + self.settings.initMem,
        '-XX:+UseConcMarkSweepGC',
        '-XX:+CMSIncrementalPacing',
        '-XX:ParallelGCThreads=' + self.settings.cpus,
        '-XX:+AggressiveOpts',
        '-jar',
        path.join(self.settings.paths.bin, self.settings.jar),
        'nogui'
    ];
    self.startup.cwd = self.settings.paths.bin;

    self.players = [];

    self.on('stdout', parseOutput);
    self.on('stderr', parseOutput);
    self.on('shutdown::done', function() {
	log('Server has been shut down', 'info');
	self.server = null;
    });

    function parseOutput(data) {
	var str = data.toString().trim();
        //player connect
        var tmp = str.match(/\[INFO\] ([^\s]+) .* logged in /),
        name = tmp ? tmp[1] : null;

        if(name && self.players.indexOf(name) === -1) {
	    self.emit('player::connect', name);
	    log('Player connected: ' + name, 'debug');
            self.players.push(name);
	}

        //player disconnect
        var i, player, 
	tmp = str.match(/\[INFO\] ([^\s]+) lost connection/);

        if(tmp) {
            player = tmp[1];
	    self.emit('player::disconnect', player);
	    log('Player disconnected: ' + name, 'debug');
            i = players.indexOf(player);
            if(i !== -1)
                players.splice(i, 1);
        }

	//chat message
	var parts = str.match(/^([0-9\-: ]+) \[INFO\] <([^>]+)> (.*)$/);

	if(parts)  {
	    log('Player ' + parts[2] + 'chatted: ' + parts[3], 'debug');
	    self.emit('player::chat', parts[2], parts[3]);
	}

	//server startup
	var done = str.match(/^([0-9\-: ]+) \[INFO\] Done \([0-9\.s]+\)!/);
	if(done) {
	    log('Minecraft has started up', 'info');
	    self.emit('startup::done');
	}
    };
};

//Minecraft inherits from Server class
util.inherits(Minecraft, Server);

//Uncomment to override:
//Minecraft.prototype.start = function(emit) {};
//Minecraft.prototype.cmd = function(args, emit) {};

//Public methods overriding base Server
Minecraft.prototype.stop = function(emit) {
    var self = this;

    if(self._isRunning()) {
        self.cmd('stop', false);
	log('Stopping server...', 'info');
	self.on('shutdown::done', function() {
	    self._cmdDone(emit);
	});
        return true;
    }

    log('Server is not running', 'info');
    self._cmdDone(emit);
    return false;
};

Minecraft.prototype.restart = function() {
    var self = this;

    var succ = self.stop(false);
    if(succ) {
	self.on('shutdown::done', function() {
	    self.start();
	});
    } else {
	self.start();
    }
};

Minecraft.prototype.status = function() {};
Minecraft.prototype.update = function() {};