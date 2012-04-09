#!/usr/bin/env node

/**
 * Panther Server Manager CLI
**/

var Psm = require('../lib/psm').Psm,
log = require('../lib/logger').log,
path = require('path'),
colors = require('colors'),
fs = require('fs'),
rl = require('readline').createInterface(process.stdin, process.stdout),
config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json')));

colors.setTheme(config.colors);

var servers = JSON.parse(fs.readFileSync(path.join(__dirname, '../servers.json'))),
psm = new Psm(servers),
prompt = 'psm'.promptText + '> '.prompt,
promptLen = 5,
welcome = "\n" +
    "________ ".P  + "________".S + "______  ___\n".M +
    "___  __ \\".P + "__  ___/".S + "___   |/  /\n".M +
    "__  /_/ /".P  + "_____ \\".S + " __  /|_/ / \n".M +
    "_  ____/ ".P  + "____/ / ".S + "_  /  / /  \n".M +
    "/_/      ".P  + "/____/  ".S + "/_/  /_/   \n".M,

//built in commands
cmds = {
    help: {
	man: 'displays this help message',
	func: function() {
	    log('Available Commands:');
	    log('-------------------');
	    for(var cmd in cmds) {
		if(cmds.hasOwnProperty(cmd)) {
		    log(cmd.helpCmd + ' - '.helpDash + cmds[cmd].man.helpMan);
		}
	    }
	}
    },
    echo: {
	man: 'displays a string of text',
	func: function(line) { 
	    log(line.substr(line.indexOf(' ') + 1)); 
	}
    },
    exit: {
	man: 'exits the CLI',
	func: function() {
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
	
	if(cmds[cmd]) 
	    cmds[cmd].func(line);
	else
	    log('Unkown command, try "help"');
    }

    rl.prompt();
}).on('close', cmds.exit.func);

//start prompting
rl.setPrompt(prompt, promptLen);
rl.prompt();