/**
 * Minecraft server class for controlling minecraft servers
 **/
var Server = require('../server').Server,
path = require('path'),
spawn = require('child_process').spawn,
colors = require('colors'),
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
	log('Minecraft has stopped.', 'info');
	self.server = null;
    });

    self._outputParsers = [
	function(str) {
            //player connect
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] ([^\s]+) \[\/([\d\.:]+)\] logged in with entity id ([\d]+) at \(\[([\w]+)\] ([\d\.\-, ]+)\)$/);

	    if(parts) {
		//0 = entire message,
		//1 = timestamp,
		//2 = player name,
		//3 = IP:Port
		//4 = entity id
		//5 = world logged into
		//6 = location logged into
		var name = parts[2];
		
		if(this.players.indexOf(name) === -1) {
		    this.emit('player::connect', name);
		    log('Player connected: ' + name, 'debug');
		    this.players.push(name);
		}
	    }
	},
	function(str) {
            //player disconnect
            var i, player, 
	    parts = str.match(/^([0-9\-: ]+) \[INFO\] ([^\s]+) lost connection: ([\w\. ]+)$/);
	    
            if(parts) {
		//0 = entire message,
		//1 = timestamp,
		//2 = player name,
		//3 = reason
		this.emit('player::disconnect', parts[2]);
		log('Player disconnected: ' + parts[2], 'debug');
		i = this.players.indexOf(parts[2]);
		if(i !== -1)
                    this.players.splice(i, 1);
            }
	},
	function(str) {
	    //chat message
	    str = str.stripColors;
	    var parts = str.match(/^([0-9\-: ]+) \[INFO\] <([^>]+)> (.*)$/);
	    
	    if(parts)  {
		//0 = entire msg,
		//1 = timestamp,
		//2 = player name,
		//3 = message
		log('Player ' + parts[2] + 'chatted: ' + parts[3], 'debug');
		this.emit('player::chat', parts[2], parts[3]);
	    }
	},
	function(str) {
	    //server startup
	    var parts = str.match(/^([0-9\-: ]+) \[INFO\] Done \(([0-9\.s]+)\)!/);

	    if(parts) {
		//0 = entire message,
		//1 = timestamp,
		//2 = startup time
		log('Minecraft has started up (' + parts[2] + ')', 'info');
		this.emit('startup::done');
	    }
	},
	function(str) {
	    //errors
	    var parts = str.match(/^([0-9\-: ]+) \[(SEVERE|WARNING|FATAL)\] (.*)$/);

	    if(parts) {
		//0 = entire message,
		//1 = timestamp,
		//2 = message type,
		//3 = message
		var scrn = (parts[2] == 'FATAL');
		
		//I have NO IDEA why this is just a warning...
		if(scrn || (parts[2] == 'WARNING' && parts[3] == '**** FAILED TO BIND TO PORT!')) {
		    //we need to log the error and kill the server
		    log('Minecraft unable to start: ' + parts[3], 'error');
		    this.stop(true, true);
		} else {
		    log('Minecraft Error: ' + parts[0], 'error', scrn);
		}
	    }
	}	
    ];

    function parseOutput(data) {
	var str = data.toString().trim();
	self._outputParsers.forEach(function(parser) {
	    parser.call(self, str);
	});
    }
};

//Minecraft inherits from Server class
util.inherits(Minecraft, Server);

//Uncomment to override:
//Minecraft.prototype.start = function(emit) {};
//Minecraft.prototype.cmd = function(args, emit) {};

//Public methods overriding base Server
Minecraft.prototype.stop = function(emit, killOnTimeout) {
    var self = this;

    if(self.isRunning()) {
        self.cmd('stop', false);
	log('Stopping server...', 'info');
	self.on('shutdown::done', function() {
	    self._cmdDone(emit);
	});
	if(killOnTimeout) {
	    setTimeout(function() {
		self.server.kill();
	    }, 2000);
	}
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