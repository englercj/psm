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
eyes = require('eyes'),
psm = require('../psm'),
flatiron = require('flatiron');

var cli = exports,
inspect = eyes.inspector({
    stream: null
});

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

    psm.manager.cmd('start', server, remote, function() {
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

    psm.manager.cmd('stop', server, remote, function(err, res) {
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

    psm.manager.cmd('restart', server, remote, function(err, res) {
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

    psm.manager.cmd('status', server, remote, function(err, res) {
	//TODO: Parse info object
	psm.log.info(info);
    });
});

app.cmd(/list (.+)?/, cli.list = function() {
    var remote = app.argv._[1];

    psm.log.silly('Got list command for remote: ' + remote);

    psm.manager.cmd('list', 'servers', remote, function(err, res) {
	//TODO: Parse servers
	psm.log.info(servers);
    });
});

/*
app.cmd(/(attach|console) ([^@]+)(@.+)?/, cli.attachToServer = function() {
    var args = app.argv._[1].match(/([^@]+)(@.+)?/),
    server, remote;

    if(args !== null) {
	server = args[1];
	remote = (args[2] ? args[2].replace('@', '') : null);
    }

    psm.log.silly('Got attach command for server: ' + server + ', at remote: ' + remote);

    psm.manager.cmd('openConsole', server, function(err, res) {
	//TODO: Pipe and/or listen to stream
	psm.log.info(stream);
	stream.end();
    });
});
*/
app.cmd(/(add|rm) remote (.+)(:[\d]+)?/, cli.remoteAdd = function() {
    var cmd = app.argv._[0],
    remote = app.argv._[2];
    

    psm.log.silly('Got remote ' + cmd + ' command for ' + remote);

    psm.manager.cmd(cmd, 'remote', remote, function(err, res) {
	
    });
});

app.cmd(/(add|rm) server (.+)?/, cli.importServers = function() {
    var cmd = app.argv_[0],
    file = app.argv._[2] || null;

    psm.log.silly('Got ' + cmd + ' command' +
		  (file ? ', with arg: ' + file : '.'));

    //open file, parse out server obj, parse out remote hostname
    if(cmd == 'add') {
	if(file) {
	    try {
		file = require(path.resolve(file));
	    } catch(e) {
		psm.log.error('Unable to open file: ' + file, e);
		return;
	    }
	    
	    psm.log.debug('Requesting server add.', file);
	    psm.manager.cmd(cmd, 'server', file, function(err, res) {
		psm.log.silly('Add Response:', { err: err, res: res });
		if(err) {
		    psm.log.error('Unable to add server', err);
		} else {
		    psm.log.info('New server added to local manager.');
		}		
	    });
	} else {
	    //TODO: Prompts
	    var serv = {};
	    psm.manager.cmd(cmd, 'server', file, function(err, res) {
		psm.log.silly('Add Response:', { err: err, res: res });
		if(err) {
		    psm.log.error('Unable to add server', err);
		} else {
		    psm.log.info('New server added to local manager.');
		}
	    });
	}
    } else {
	psm.log.debug('Reqesting server removal.', file);
	psm.manager.cmd(cmd, 'server', file, function(err, res) {
	    psm.log.silly('Remove Response:', { err: err, res: res });
	    if(err) {
		psm.log.error('Unable to remove server', err);
	    } else {
		psm.log.info('New server added to local manager.');
	    }
	});
    }
});

app.cmd('config', cli.config = function() {
    psm.log.silly('Got config command.');

    psm.log.info('Current Configuration:\n' + inspect(psm.config.store).cyan);
});

cli.start = function() {
    app.init(function() {
	if(app.argv._.length && actions.indexOf(app.argv._[0]) === -1) {
	    app.argv._.push(app.argv._[0]);
	    return cli.showServerInfo();
	}
	
	app.start();
    });
};