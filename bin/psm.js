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

servers = JSON.parse(fs.readFileSync(path.join(__dirname, '../servers.json'))),
psm = new Psm(servers),
prompt = 'psm'.cyan + '> '.green,
promptLen = 5,
welcome = 
    "________ ".red  + "________".white + "______  ___\n".blue +
    "___  __ \\".red + "__  ___/".white + "___   |/  /\n".blue +
    "__  /_/ /".red  + "_____ \\".white + " __  /|_/ / \n".blue +
    "_  ____/ ".red  + "____/ / ".white + "_  /  / /  \n".blue +
    "/_/      ".red  + "/____/  ".white + "/_/  /_/   \n".blue,
cmds = {
    echo: echo, help: help, exit: exit
};

//CLI processing
console.log(welcome);
console.log('Panther Server Manager CLI has started.'.green);
console.log('Type "help" for a command list'.yellow);

//process each line
rl.on('line', function(line) {
    line = line.trim();
    if(line) {
	var cmd = line.split(' ')[0];
	
	if(cmds[cmd]) 
	    cmds[cmd](line);
	else
	    log('Unkown command, try "help"');
    }

    rl.prompt();
}).on('close', exit);

//start prompting
rl.setPrompt(prompt, promptLen);
rl.prompt();

//built in functions
function help() {
    
}

function echo(line) { 
    log(line.substr(line.indexOf(' ') + 1)); 
}

function exit() {
    log('Good bye!');
    process.exit(0);
}