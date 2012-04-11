/**
 * Panther Server Manager CLI
 * TODO:
 * - Don't allow exit with servers running
 **/

//load required modules
var Psm = require('./psm').Psm,
log = require('./logger').log,
path = require('path'),
colors = require('colors'),
util = require('util'),
events = require('events'),
fs = require('fs'),
rl = require('readline').createInterface(process.stdin, process.stdout),
config = require('../config/config.json');

var Cli = exports.Cli = function(psm) {
    events.EventEmitter.call(this);
    //set color theme for CLI
    colors.setTheme(config.colors);

    //setup CLI and initialize Psm module
    var self = this,
    //psm = new Psm(servers),
    prompt = config.promptText.promptText + config.prompt.prompt,
    promptLen = config.promptText.length + config.prompt.length,
    welcome = "\n" +
        "________ ".P  + "________".S + "______  ___\n".M +
        "___  __ \\".P + "__  ___/".S + "___   |/  /\n".M +
        "__  /_/ /".P  + "_____ \\".S + " __  /|_/ / \n".M +
        "_  ____/ ".P  + "____/ / ".S + "_  /  / /  \n".M +
        "/_/      ".P  + "/____/  ".S + "/_/  /_/   \n".M,

    //built in commands
    cmds = {
        games: {
            usage: '<start|stop|restart|status|running|add>',
            man: 'start|stop|restarts all games, add adds a new game\nstatus will print' +
		'all game status\n running lists running servers',
            args: 1,
            func: function(line, args) {
                cmd = args[1];

                if(cmd == 'add') {
                    log('I haven\'t implemented that yet!', 'error');
		    self.emit('cmd::done');
                } else if(cmd == 'status') {
		    log('Servers Statuses:');
		    var srvs = psm.settings.servers;
		    for(var srv in srvs) {
			if(srvs.hasOwnProperty(srv)) {
			    //format name & aliases
			    var msg = srvs[srv].name.helpCmd + ' [' + srv;
			    if(srvs[srv].aliases && srvs[srv].aliases.length > 0)
				msg += ', ' + srvs[srv].aliases.join(', ');
			    msg += '] - ' + (psm.isRunning(srv) ? 'RUNNING'.running : 'NOT RUNNING'.stopped);

			    log(msg);
			}
		    }
		    self.emit('cmd::done');
		} else if(cmd == 'running') {
		    if(!psm.anyRunning()) {
			log('No servers are running');
		    } else {
			var srvs = psm.getRunning();
			
			log('Running Servers:');
			for(var srv in srvs) {
			    if(srvs.hasOwnProperty(srv)) {
				//format name & aliases
				var msg = srvs[srv].name.helpCmd + ' [' + srv;
				if(srvs[srv].aliases && srvs[srv].aliases.length > 0)
				    msg += ', ' + srvs[srv].aliases.join(', ');
				msg += ']';
				
				log(msg);
			    }
			}
		    }
		    self.emit('cmd::done');
		} else {
		    psm.cmdAll(cmd);
                }
            }
        },
        game: {
            usage: '<server-id> <start|stop|restart|status>',
            man: 'main game control command, server-id is defined in servers.json',
            args: 2,
            func: function(line, args) {
		//pass args after removing 'game' one
		args.splice(0, 1);
		psm.cmd(args);
            }
        },
        help: {
            usage: '[cmd]',
            man: 'displays this help message, or specific command help',
            args: 0,
            func: function(line, args) {
                if(args.length > 1) {
                    if(cmds[args[1]]) {
                        log(args[1].helpCmd + ' ' + cmds[args[1]].usage.helpUsage);
                        log('-> ' + cmds[args[1]].man.helpMan);
                    } else {
                        log('Unkown command, try "help"', 'info');
                    }
                } else {
                    log('Available Commands:');
                    log('-------------------');
                    for(var cmd in cmds) {
                        if(cmds.hasOwnProperty(cmd)) {
                            log(cmd.helpCmd + ' - '.helpDash + cmds[cmd].man.helpMan);
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
                log(line.substr(line.indexOf(' ') + 1));
		self.emit('cmd::done');
            }
        },
        exit: {
            usage: '',
            man: 'exits the CLI',
            args: 0,
            func: function(line, args) {
		if(psm.anyRunning()) {
		    log('Cannot exit with servers running!'.error);
		    var cmd = 'games running';
		    cmds.games.func(cmd, cmd.split(' '));
		} else {
                    log('Exiting...Good bye!');
		    //give it some time to write to log
                    setTimeout(function() { process.exit(0); }, 300);
		}
            }
        }
    };

    self.start = function() {
        //CLI processing
        log(welcome);
        log('Panther Server Manager CLI has started.'.startMessage);
        log('Type "help" for a command list'.typeHelpMessage);

        //process each line
        rl.on('line', function(line) {
            line = line.trim();
            log(prompt + line, false);

            if(line) {
                var args = line.split(' '),
		cmd = args[0];

                if(cmds[cmd]) {
                    if(cmds[cmd].args && args.length <= cmds[cmd].args) {
                        log(cmd + ' requires ' + cmds[cmd].args + ' args, please see "help ' + cmd + '"', 'info');
			self.emit('cmd::done');
		    }
                    else
                        cmds[cmd].func(line, args);
                }
                else {
                    log('Unkown command, try "help"', 'info');
		    self.emit('cmd::done');
		}
            } else {
		self.emit('cmd::done');
	    }
        }).on('close', cmds.exit.func);

        rl.setPrompt(prompt, promptLen);
	rl.prompt();
    }
    psm.on('cmd::done', function() { self.emit('cmd::done'); });
    self.on('cmd::done', function() { rl.prompt(); });
}

//Inherits event emmitter
util.inherits(Cli, events.EventEmitter);