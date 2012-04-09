#!/usr/bin/env node

/**
 * Panther Server Manager CLI
 **/

//load required modules
var Psm = require('../lib/psm').Psm,
log = require('../lib/logger').log,
path = require('path'),
colors = require('colors'),
fs = require('fs'),
rl = require('readline').createInterface(process.stdin, process.stdout),
config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'))),
servers = JSON.parse(fs.readFileSync(path.join(__dirname, '../servers.json')));

//set color theme for CLI
colors.setTheme(config.colors);

//setup CLI and initialize Psm module
var psm = new Psm(servers),
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
        usage: '<start|stop|restart|status|add>',
        man: 'applies command to all games tracked, add will add a new game',
        args: 2,
        func: function() {
	    cmd = args[1];

	    if(cmd == 'add') {
		log('I haven\'t implemented that yet!', 'error');
	    } else {
		if(psm[cmd + 'All'])
		    psm[cmd + 'All']();
		else
		    log('Unkown command, try "help games"', 'info');
	    }
	}
    },
    game: {
        usage: '<server-id> <start|stop|restart|status>',
        man: 'main game control command, server-id is defined in servers.json',
        args: 2,
        func: function(line, args) {
            game = args[0];
            cmd = args[1];

	    if(psm[cmd])
		psm[cmd](game);
	    else
		log('Unkown command, try "help game"', 'info');
        }
    },
    help: {
        usage: '[cmd]',
        man: 'displays this help message, or specific command help',
        args: 0,
        func: function(line, args) {
            if(args.length > 0) {
		if(cmds[args[0]]) {
		    log(args[0].helpCmd + ' ' + cmds[args[0]].usage.helpUsage);
		    log('-> ' + cmds[args[0]].man.helpMan);
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
        }
    },
    echo: {
        usage: '[text string]',
        man: 'displays a string of text',
        args: 0,
        func: function(line, args) {
            log(line.substr(line.indexOf(' ') + 1));
        }
    },
    exit: {
        usage: '',
        man: 'exits the CLI',
        args: 0,
        func: function(line, args) {
            log('Good bye!');
            process.exit(0);
        }
    }
};

//CLI processing
log(welcome);
log('Panther Server Manager CLI has started.'.startMessage);
log('Type "help" for a command list'.typeHelpMessage);

//process each line
rl.on('line', function(line) {
    line = line.trim();
    log(prompt + line, false);

    if(line) {
        var cmd = line.split(' ')[0];

        if(cmds[cmd]) {
            args = line.split(' ').splice(1);
            if(args.length < cmds[cmd].args)
                log(cmd + ' requires ' + cmds[cmd].args + ' args, please see "help' + cmd + '"', 'info');
            else
                cmds[cmd].func(line, args);
        }
        else
            log('Unkown command, try "help"', 'info');
    }

    rl.prompt();
}).on('close', cmds.exit.func);

//start prompting
rl.setPrompt(prompt, promptLen);
rl.prompt();