/**
 * Panther Server Manager CLI
 * TODO:
 * - Don't allow exit with servers running
 **/

//load required modules
var Psm = require('./psm').Psm,
Api = require('./api').Api,
//log = require('./logger').log,
path = require('path'),
colors = require('colors'),
util = require('util'),
events = require('events'),
fs = require('fs'),
rl = require('readline').createInterface(process.stdin, process.stdout),
config = require('../config/config.json');

var Cli = exports.Cli = function(psm, api, logger) {
    //setup events
    events.EventEmitter.call(this);

    //set color theme for CLI
    colors.setTheme(config.colors);

    var self = this;

    self._logger = logger;
    self._api = api;
    self._piping = false;
    self._psm = psm;
    self._prompt = config.promptText.promptText + config.prompt.prompt;
    self._promptLen = config.promptText.length + config.prompt.length;
    self._welcome = "\n" +
        "________ ".P  + "________".S + "______  ___\n".M +
        "___  __ \\".P + "__  ___/".S + "___   |/  /\n".M +
        "__  /_/ /".P  + "_____ \\".S + " __  /|_/ / \n".M +
        "_  ____/ ".P  + "____/ / ".S + "_  /  / /  \n".M +
        "/_/      ".P  + "/____/  ".S + "/_/  /_/   \n".M;

    self._psm.on('cmd::done', function() { 
	self.emit('cmd::done'); 
    });

    self.on('cmd::done', function() {
	if(!self._piping) 
	    self._detachLog();

        rl.prompt();
    });

    self._pipeEcho = function(data) {
	var str = data.toString().trim();
	
	if(str) {
	    self._logger.log(str);
	    self.emit('cmd::done');
	}
    };

    //built in commands
    self._cmds = {
	api: {
	    usage: '<start|stop|status>',
	    man: 'starts or stops the API service',
	    args: 1,
	    func: function(line, args) {
		var cmd = args[1];

		switch(cmd) {
		case 'start':
		    if(self._api)
			self._api.start();
		    else {
			self._api = new Api(self._psm, self._logger);
			self._api.start();
		    }
		    break;
		case 'stop':
		    if(self._api)
			self._api.stop();
		    else {
			self._logger.log('There is no API Service initialized');
		    }
		    break;
		case 'status':
		    if(self._api && self._api.isRunning()) {
			self._logger.log('The API Service is currently ' + 'Running'.running);
		    } else {
			self._logger.log('The API Service is currently ' + 'Not Running'.stopped);
		    }
		    break;
		}
		self.emit('cmd::done');
	    }
	},
        pipe: {
            usage: '<open|close> [game]',
            man: 'opens or closes a pipe directly to a server\'s cli',
            args: 1,
            func: function(line, args) {
                var cmd = args[1];

                if(cmd == 'open') {
                    if(args.length < 3) {
                        self._logger.log('You must specify a game to open a pipe to');
                    }
                    var srv = self._psm.getServer(args[2]);

                    if(srv) {
			self._piping = {
			    sid: args[2],
			    server: srv
			};
                        srv.on('stdout', self._pipeEcho);
                        srv.on('stderr', self._pipeEcho);
                        rl.setPrompt(config.prompt, config.prompt.length);
                    } else {
                        self._logger.log('Uninitialized server ' + args[2]);
                    }
                } else if(cmd == 'close') {
                    self._piping.server.removeListener('stdout', self._pipeEcho);
                    self._piping.server.removeListener('stderr', self._pipeEcho);
                    self._piping = false;
                    rl.setPrompt(self._prompt, self._promptLen);
                } else {
                    self._logger.log('Unknown param passed to pipe');
                }
                self.emit('cmd::done');
            }
        },
        games: {
            usage: '<start|stop|restart|status|running|add>',
            man: 'start|stop|restarts all games, add adds a new game\nstatus will print ' +
                'all game statuses\n running lists running servers',
            args: 1,
            func: function(line, args) {
                var cmd = args[1];

                if(cmd == 'add') {
                    self._logger.log('I haven\'t implemented that yet!', 'error');
                    self.emit('cmd::done');
                } else if(cmd == 'status') {
                    self._logger.log('Servers Statuses:');
                    var srvs = self._psm.settings.servers;
                    for(var srv in srvs) {
                        if(srvs.hasOwnProperty(srv)) {
                            //format name & aliases
                            var msg = srvs[srv].name.helpCmd + ' [' + srv;
                            if(srvs[srv].aliases && srvs[srv].aliases.length > 0)
                                msg += ', ' + srvs[srv].aliases.join(', ');
                            msg += '] - ' + (self._psm.isRunning(srv) ? 
					     'RUNNING'.running : 'NOT RUNNING'.stopped);

                            self._logger.log(msg);
                        }
                    }
                    self.emit('cmd::done');
                } else if(cmd == 'running') {
                    if(!psm.anyRunning()) {
                        self._logger.log('No servers are running');
                    } else {
                        var srvs = self._psm.getRunning();

                        self._logger.log('Running Servers:');
                        for(var srv in srvs) {
                            if(srvs.hasOwnProperty(srv)) {
                                //format name & aliases
                                var msg = srvs[srv].name.helpCmd + ' [' + srv;
                                if(srvs[srv].aliases && srvs[srv].aliases.length > 0)
                                    msg += ', ' + srvs[srv].aliases.join(', ');
                                msg += '] - ' + (self._psm.isRunning(srv) ? 
						 'RUNNING'.running : 'NOT RUNNING'.stopped);

                                self._logger.log(msg);
                            }
                        }
                    }
                    self.emit('cmd::done');
                } else {
                    self._psm.cmdAll(cmd);
                }
            }
        },
        game: {
            usage: '<server-id> <start|stop|restart|players|status>',
            man: 'main game control command, server-id is defined in servers.json',
            args: 2,
            func: function(line, args) {
                var sid = args[1],
                cmd = args[2];
                if(cmd == 'status') {
                    //remove 'game' from array
                    var status = self._psm.cmd([sid, cmd], false),
                    name = self._psm.options(sid, 'name');

                    if(status) {
                        self._logger.log(name.helpCmd);
                        self._logger.log('Running: ' + (status.up ? 'RUNNING'.running : 'NOT RUNNING'.stopped));
                        for(var o in status) {
                            if(status.hasOwnProperty(o) && o != 'up' &&
                               typeof(status[o]) != 'object' && typeof(status[o]) != 'function') {
                                var title = o.charAt(0).toUpperCase() + o.slice(1),
                                value = (status[o] instanceof Array ? status[o].join(', ') : status[o]);
                                self._logger.log(title + ': ' + value);
                            }
                        }
                    } else {
                        self._logger.log('Could not find a server with id "' + sid + '"');
                        self._logger.log(opts, 'debug');
                    }

                    self.emit('cmd::done');
                } else if(cmd == 'players') {
                    var sid = args[1],
                    players = self._psm.cmd([sid, 'getPlayers'], false);
                    self._logger.log('Connected Players: '.helpCmd + players.join(', '));

                    self.emit('cmd::done');
                } else {
                    //pass args after removing 'game' one
                    args.splice(0, 1);
                    self._psm.cmd(args);
                }
            }
        },
        help: {
            usage: '[cmd]',
            man: 'displays this help message, or specific command help',
            args: 0,
            func: function(line, args) {
                if(args.length > 1) {
                    if(self._cmds[args[1]]) {
                        self._logger.log(args[1].helpCmd + ' ' + self._cmds[args[1]].usage.helpUsage);
                        self._logger.log('-> ' + self._cmds[args[1]].man.helpMan);
                    } else {
                        self._logger.log('Unkown command, try "help"');
                    }
                } else {
                    self._logger.log('Available Commands:');
                    self._logger.log('-------------------');
                    for(var cmd in self._cmds) {
                        if(self._cmds.hasOwnProperty(cmd)) {
                            self._logger.log(cmd.helpCmd + ' - '.helpDash + self._cmds[cmd].man.helpMan);
                        }
                    }

                }
                self.emit('cmd::done');
            }
        },
        echo: {
            usage: '[text string]',
            man: 'displays a string of text',
            args: 0,
            func: function(line, args) {
                self._logger.log(line.substr(line.indexOf(' ') + 1));
                self.emit('cmd::done');
            }
        },
        exit: {
            usage: '',
            man: 'exits the CLI',
            args: 0,
            func: function(line, args) {
                if(self._psm.anyRunning()) {
                    self._logger.log('Cannot exit with servers running!'.error);
                    var cmd = 'games running';

		    //run the running cmd, which will cmd::done for us
                    self._cmds.games.func(cmd, cmd.split(' '));
                } else {
                    self._logger.log('Exiting...Good bye!');
                    //give it some time to flush log
                    setTimeout(function() { process.exit(0); }, 300);
                }
            }
        }
    };
}

//Inherits event emmitter
util.inherits(Cli, events.EventEmitter);

Cli.prototype.start = function() {
    var self = this;

    //CLI processing
    self._attachLog();
    self._logger.log(self._welcome);
    self._logger.log('Panther Server Manager CLI has started.'.startMessage);
    self._logger.log('Type "help" for a command list'.typeHelpMessage);

    self._processLines();

    rl.setPrompt(self._prompt, self._promptLen);
    self.emit('cmd::done');
};

Cli.prototype._processLines = function() {
    var self = this;

    //process each line
    rl.on('line', function(line) {
        line = line.trim();
	//log file makes more sense if it has the prompt in it
        self._logger.log(self._prompt + line, false);

        if(line) {
            var args = line.split(' '),
            cmd = args[0];

	    self._attachLog();

            if(self._piping) {
                if(cmd == 'pipe') {
                    self._cmds.pipe.func(line, args);
                } else {
		    //args.splice(0, 0, self._piping.sid, 'cmd');
		    //self._psm.cmd(args);
		    self._piping.server.cmd(line);
                }
            } else {
                if(self._cmds[cmd]) {
                    if(self._cmds[cmd].args && args.length <= self._cmds[cmd].args) {
                        self._logger.log(cmd + ' requires ' + self._cmds[cmd].args + 
				  ' args, please see "help ' + cmd + '"');
                        self.emit('cmd::done');
                    }
                    else
                        self._cmds[cmd].func(line, args);
                }
                else {
                    self._logger.log('Unkown command, try "help"');
                    self.emit('cmd::done');
                }
            }
        } else {
            self.emit('cmd::done');
        }
    }).on('close', self._cmds.exit.func);
}

Cli.prototype._attachLog = function() {
    var self = this;

    if(!self._attachedLog) {
	self._attachedLog = true;
	self._logger.on('log::msg', self._logEcho);
    }
};

Cli.prototype._detachLog = function() {
    var self = this;

    if(self._attachedLog) {
	self._attachedLog = false;
	self._logger.removeListener('log::msg', self._logEcho);
    }
};

Cli.prototype._logEcho = function(msg) {
    console.log(msg);
};