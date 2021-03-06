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
    'status',
    'import',
    'list',
    'config',
    'set'
],
argvOpts = cli.argvOpts = {
    help:    { alias: 'h' },
    silent:  { alias: 's', boolean: true },
    verbose: { alias: 'v', boolean: true },
    debug:   { alias: 'd', boolean: true },
    version: { boolean: true }
},
help = [
    'Usage: psm ACTION [options]',
    '',
    'Manages the specified Minecraft server from a central API',
    '',
    'Actions:',
    '  start <server>   Starts <server>',
    '  stop <server>    Stops <server>',
    '  restart <server> Restarts <server>',
    '  status <server>  Shows the status of <server>',
    '  import <file>    Imports json server configuration to manage',
    '  list             Lists all managed servers',
    '  config [key]     Displays the psm configuration',
    '  set <key> <val>  Sets the configuration <key> to <val>',
    '',
    'Options:',
    '  -h, --help       Displays this help message',
    '  -s, --silent     Silences all output from the cli',
    '  -v, --verbose    Enables verbose output from the cli',
    '  -d, --debug      Enables debug output from the cli',
    '  --version        Displays the version of the psm module',
    '',
    'Examples:',
    '  restart minecraft server named "minecraft":',
    '    > psm restart minecraft',
    '',
    '  import a json config for a new server to manage:',
    '    > psm import server.json',
    '',
    '  import a json config for the psm module:',
    '    > psm config config.json',
    ''
];

flatiron.app.use(flatiron.plugins.cli, {
    argv: argvOpts,
    usage: help
});

//////////
// Command handlers
///////////////////////////
app.cmd(/start (.+)/, cli.startServer = function(server) {
    //var server = app.argv._[1];

    //psm.log.silly('Got start command for server: %s', server);

    psm.log.info('Starting server %s', server);
    psm.manager.cmd('start', server, function(err, res) {
        if(err) {
            psm.log.error(err, 'Unable to start server.', function() {
                process.exit(1);
            });
        } else {
            psm.log.info('Server has started.', function() {
                process.exit(0);
            });
        }
    });
});

app.cmd(/stop (.+)/, cli.stopServer = function(server) {
    //var server = app.argv._[1];

    //psm.log.silly('Got stop command for server: %s', server);

    psm.log.info('Stopping server %s', server);
    psm.manager.cmd('stop', server, function(err, res) {
        if(err) {
            psm.log.error(err, 'Unable to stop server.', function() {
                process.exit(1);
            });
        } else {
            psm.log.info('Server has stopped.', function() {
                process.exit(0);
            });
        }
    });
});

app.cmd(/restart (.+)/, cli.restartServer = function(server) {
    //var server = app.argv._[1];

    //psm.log.silly('Got restart command for server: %s', server);

    psm.log.info('Restarting server %s', server);
    psm.manager.cmd('restart', server, function(err, res) {
        if(err) {
            psm.log.error(err, 'Unable to restart server.', function() {
                process.exit(1);
            });
        } else {
            psm.log.info('Server has restarted.', function() {
                process.exit(0);
            });
        }
    });
});

app.cmd(/status (.+)/, cli.showServerInfo = function(server) {
    //var server = app.argv._[1];

    //psm.log.silly('Got status command for server: %s', server);

    psm.log.info('Getting status of server %s', server);
    psm.manager.cmd('status', server, function(err, res) {
        //TODO: Parse info object
        if(err) {
            psm.log.error(err, 'Unable to get server status.', function() {
                process.exit(1);
            });
        } else {
            psm.log.info(res, function() {
                process.exit(0);
            });
        }
    });
});

app.cmd('list', cli.list = function() {
    psm.log.silly('Got list command.');

    psm.manager.cmd('list', function(err, res) {
        //TODO: Parse servers
        if(err) {
            psm.log.error(err, 'Unable to get server list.', function() {
                process.exit(1);
            });
        } else {
            psm.log.info(res, function() {
                process.exit(0);
            });
        }
    });
});

app.cmd(/(add|rm) server (.+)?/, cli.importServers = function(cmd, file) {
    //var cmd = app.argv._[0],
    //file = app.argv._[2] || null;

    psm.log.silly('Got %s command%s', cmd, (file ? ', with arg: ' + file : '.'));

    //open file ad get server object
    if(cmd == 'add') {
        if(file) {
            try {
                file = require(path.resolve(file));
            } catch(e) {
                psm.log.error(e, 'Unable to open file: %s', file, function() {
                    process.exit(1);
                });
                return;
            }

            psm.log.debug('Requesting server add.', file);
            psm.manager.cmd(cmd, 'server', file, function(err, res) {
                psm.log.silly({ err: err, res: res }, 'Add response');
                if(err) {
                    psm.log.error(err, 'Unable to add server', function() {
                        process.exit(1);
                    });
                } else {
                    psm.log.info('New server added to manager.', function() {
                        process.exit(0);
                    });
                }
            });
        } else {
            //TODO: Prompts
            var serv = {};
            psm.manager.cmd(cmd, 'server', file, function(err, res) {
                psm.log.silly({ err: err, res: res }, 'Add Response');
                if(err) {
                    psm.log.error(err, 'Unable to add server', function() {
                        process.exit(1);
                    });
                } else {
                    psm.log.info('New server added to manager.', function() {
                        process.exit(0);
                    });
                }
            });
        }
    } else {
        psm.log.debug('Reqesting server removal.', file);
        psm.manager.cmd(cmd, 'server', file, function(err, res) {
            psm.log.silly({ err: err, res: res }, 'Remove Response');
            if(err) {
                psm.log.error(err, 'Unable to remove server', function() {
                    process.exit(1);
                });
            } else {
                psm.log.info('Server removed from manager.', function() {
                    process.exit(0);
                });
            }
        });
    }
});

app.cmd(/config ([\w-_]+)?/, cli.config = function(key) {
    //var key = app.argv._[1];

    psm.log.silly('Got config command, with key: %s', key);

    psm.log.info('Current Configuration:\n%s', inspect(key ? psm.config[key] : psm.config).cyan, function() {
        process.exit(0);
    });
});

app.cmd(/set ([\w-_]+) (.+)/, cli.set = function(key, val) {
    //var key = app.argv._[1],
    //val = app.argv._[2];

    psm.log.silly('Got set command, with key: %s, value: %s', key, val);

    psm.manager.cmd('config', key, val, function(err, res) {
        psm.log.silly({ err: err, res: res }, 'Set config response');
        if(err) {
            psm.log.error(err, 'Unable to set configuration', function() {
                process.exit(1);
            });
        } else {
            psm.log.info('Configuration set!', function() {
                process.exit(0);
            });
        }	
    });
});

cli.start = function() {
    app.init(function() {
        //psm <server> shows status
        if(app.argv._.length && actions.indexOf(app.argv._[0]) === -1) {
            app.argv._.push(app.argv._[0]);
            return cli.showServerInfo();
        }

        //-h, --help shows help
        if(app.argv.help) {
            var done = 0;

            help.forEach(function(line) {
                psm.log.info(line, function() {
                    done++;
                    if(done == help.length)
                        process.exit(0);
                });
            });
            return;
        }

        //--version to show version
        if(app.argv.version) {
            psm.log.info('Version: %s', psm.version, function() {
                process.exit(0);
            });
            return;
        }

	//-s, --silent to be silent
	if(app.argv.silent) {
	    psm.log.transports[1].level = 'silent';
	}

	//-v, --verbose to be verbose
	if(app.argv.verbose) {
	    psm.log.transports[1].level = 'verbose';
	}

	//-d, --debug to be debug
	if(app.argv.debug) {
	    psm.log.transports[1].level = 'debug';
	}

        app.start();
    });
};