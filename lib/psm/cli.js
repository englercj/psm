/**
 * cli.js: provides the CLI used to interact with the PSM application
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

//////////
// Required Includes
///////////////////////////
var fs = require('fs'),
path = require('path'),
cp = require('child_process'),
util = require('util'),
psm = require('../psm'),
flatiron = require('flatiron');

var cli = exports;

//////////
// Setup flatiron CLI
///////////////////////////
var app = flatiron.app,
actions = [
    'start',
    'stop',
    'restart',
    'import',
    'list',
    'status',
    'manager',
    'remote',
    'config',
    'attach'
],
argvOpts = cli.argvOpts = {
    help:    { alias: 'h' },
    silent:  { alias: 's', boolean: true },
    verbose: { alias: 'v', boolean: true },
    debug:   { alias: 'd', boolean: true },
    version: { boolean: true },
},
help = [
    'usage: psm ACTION [options] SERVER[@REMOTE]',
    '',
    'Manages the specified Minecraft server from a central API',
    '',
    'actions:',
    '  start            Starts SERVER',
    '  stop             Stops SERVER',
    '  restart          Restarts SERVER',
    '  import <file>    Imports json server configuration to manage',
    '  list <remote>    Lists all manages servers at remote (or local by default)',
    '  status           Displays the stats of a managed server',
    '  config           Displays the psm configuration',
    '  version          Displays the current version of the psm module',
    '  attach           Attaches to SERVER console',
    '',
    'options:',
    '  -h, --help       Displays this help message',
    '',
    'examples:',
    '  add remote managed psm module, note that you only have to specify the',
    '  port if it has been changed from the default 8596. Even with non default',
    '  ports you will not have to specify it again later, only when adding:',
    '    > psm remote add my.remote.server.com:666',
    '  restart local minecraft server:',
    '    > psm restart minecraft',
    '  restart remote minecraft server, note that the remote has to have been',
    '  added as a managed remote already with psm remote add:',
    '    > psm restart minecraft@my.remote.server.com',
    '  open a console to a remote managed server:',
    '    > psm attach minecraft@my.remote.server.com',
    ''
];

flatiron.app.use(flatiron.plugins.cli, {
    argv: argvOpts,
    usage: help
});

//////////
// Helper functions
///////////////////////////
function updateConfig(updater) {
    updater();
    psm.config.save(function(err) {
	if(err) {
	    return psm.log.error('Error saving config: ', err);
	}
	
	cli.config();
	psm.log.linfo('Psm config saved: ' + psm.configFile.yellow);
    });
}

//////////
// Command handlers
///////////////////////////
app.cmd(/start ([^@]+)(@.+)?/, cli.startServer = function() {
    var args = app.argv._[1].match(/([^@]+)(@.+)?/),
    server, remote;

    if(args !== null) {
	server = args[1];
	remote = (args[2] ? args[2].replace('@', '') : null);
    }

    psm.log.silly('Got start command for server: ' + server + ', at remote: ' + remote);

    psm.manager.start(server, remote, function() {
	psm.log.info('Server has started.');
    });
});

app.cmd(/stop ([^@]+)(@.+)?/, cli.stopServer = function() {
    var args = app.argv._[1].match(/([^@]+)(@.+)?/),
    server, remote;

    if(args !== null) {
	server = args[1];
	remote = (args[2] ? args[2].replace('@', '') : null);
    }

    psm.log.silly('Got stop command for server: ' + server + ', at remote: ' + remote);

    psm.manager.stop(server, remote, function() {
	psm.log.info('Server has stopped.');
    });
});

app.cmd(/restart ([^@]+)(@.+)?/, cli.restartServer = function() {
    var args = app.argv._[1].match(/([^@]+)(@.+)?/),
    server, remote;

    if(args !== null) {
	server = args[1];
	remote = (args[2] ? args[2].replace('@', '') : null);
    }

    psm.log.silly('Got restart command for server: ' + server + ', at remote: ' + remote);

    psm.manager.restart(server, remote, function() {
	psm.log.info('Server has restarted.');
    });
});

app.cmd(/status ([^@]+)(@.+)?/, cli.showServerInfo = function() {
    var args = app.argv._[1].match(/([^@]+)(@.+)?/),
    server, remote;

    if(args !== null) {
	server = args[1];
	remote = (args[2] ? args[2].replace('@', '') : null);
    }

    psm.log.silly('Got status command for server: ' + server + ', at remote: ' + remote);

    psm.manager.status(server, remote, function(info) {
	//TODO: Parse info object
	psm.log.info(info);
    });
});

app.cmd(/list (.+)?/, cli.list = function() {
    var remote = app.argv._[1];

    psm.log.silly('Got list command for remote: ' + remote);

    psm.manager.list(remote, function(servers) {
	//TODO: Parse servers
	psm.log.info(servers);
    });
});

app.cmd(/(attach|console) ([^@]+)(@.+)?/, cli.attachToServer = function() {
    var args = app.argv._[1].match(/([^@]+)(@.+)?/),
    server, remote;

    if(args !== null) {
	server = args[1];
	remote = (args[2] ? args[2].replace('@', '') : null);
    }

    psm.log.silly('Got attach command for server: ' + server + ', at remote: ' + remote);

    psm.manager.openConsole(server, function(stream) {
	//TODO: Pipe and/or listen to stream
	psm.log.info(stream);
	stream.end();
    });
});

app.cmd(/remote add (.+)(:[\d]+)?/, cli.remoteAdd = function() {
    var remote = app.argv._[2];

    psm.log.silly('Got remote add command for ' + remote);

    psm.manager.remoteAdd(remote);
});

app.cmd(/remote (remove|rm) (.+)/, cli.remoteRm = function() {
    var remote = app.argv._[2];

    psm.log.silly('Got remote rm command for ' + remote);

    psm.manager.remoteRm(remote);
});

app.cmd(/manager start(@.+)?/, cli.startManager = function() {
    psm.log.silly('Got manager start command.');
    if(psm.manager) {
	//already started
	psm.log.info('PSM Manager service has already been started.');
    } else {
	psm.getManager(function(err, man) {
	    if(err) {
		psm.log.error('Error starting Manager service!', err);
	    } else {
		psm.log.info('Manager started.');
	    }
	});
    }
});

app.cmd(/import (.+)/, cli.importServers = function() {
    var file = path.resolve(app.argv._[1]);

    psm.log.silly('Got import command for file: ' + file);

    //open file, parse out server obj, parse out remote hostname
    var server = {}, remote = '';
    psm.log.debug('Attempting to import new server to remote ' + remote, server);
    psm.manager.serverAdd(server, remote);
});

app.cmd('config', cli.config = function() {
    psm.log.silly('Got config command.');

    var keys = Object.keys(psm.config.store),
    conf = util.inspect(psm.config.store, 10);

    if(keys.length <= 2) {
	conf = conf.replace(/\{\s/, '{ \n')
            .replace(/\}/, '\n}')
            .replace('\\033[90m', ' \\033[90m')
            .replace(/, /ig, ',\n ');
    }
    else {
	conf = conf.replace(/\n\s{4}/ig, '\n ');
    }

    conf.split('\n').forEach(function (line) {
	psm.log.info(line);
    });
});

cli.start = function() {
    //No manager running yet
    if(!psm.manager) {
	psm.log.info('PSM Daemon is not running, please start the PSM Daemon.');
	psm.log.info('Usually this is done with "[sudo] service psmd start"');
	process.exit(1);
    } else {
	app.init(function() {
	    if(app.argv._.length && actions.indexOf(app.argv._[0]) === -1) {
		app.argv._.push(app.argv._[0]);
		return cli.showServerInfo();
	    }
	    
	    app.start();
	});
    }
};















/*




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
	reload: {
	    usage: '[config|servers]',
	    man: 'reloads the config or settings config files',
	    args: 0,
	    func: function(line, args) {
		var reload = (args.length > 1 ? args[1] : 'config');

		if(reload == 'config') {
		    fs.readFile(path.join(__dirname, '../config/config.json'), function(err, data) {
			if(err) throw err;

			//reload config for CLI
			config = JSON.parse(data.toString());
			colors.setTheme(config.colors);
			self._prompt = config.promptText.promptText + config.prompt.prompt;
			self._promptLen = config.promptText.length + config.prompt.length;
			rl.setPrompt(self._prompt, self._promptLen);
			self._logger.log('Cli config reloaded', 'info');

			//reload module configs
			self._psm.reloadConfig(config, false);
			self._logger.reloadConfig(config, false);
			self._api.reloadConfig(config, false);

			//done
			self.emit('cmd::done');
		    });
		} else if(reload == 'servers') {
		    fs.readFile(path.join(__dirname, '../config/servers.json'), function(err, data) {
			if(err) throw err;

			self._psm.reloadServers(JSON.parse(data.toString()));
			self.emit('cmd::done');
		    });
		} else {
		    self._logger.log('Unkown config file to reload');
		}
	    }
	},
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
                        srv.hookOutput(self._pipeEcho, false);
                        rl.setPrompt(config.pipingPrompt, config.pipingPrompt.length);
                    } else {
                        self._logger.log('Uninitialized server ' + args[2]);
                    }
                } else if(cmd == 'close') {
                    self._piping.server.unhookOutput(self._pipeEcho, false);
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
*/