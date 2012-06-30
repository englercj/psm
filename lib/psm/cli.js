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
    'Usage: psm ACTION [options] SERVER[@REMOTE]',
    '',
    'Manages the specified Minecraft server from a central API',
    '',
    'Actions:',
    '  start           Starts SERVER',
    '  stop            Stops SERVER',
    '  restart         Restarts SERVER',
    '  import <file>   Imports json server configuration to manage',
    '  list <remote>   Lists all manages servers at remote (or local by default)',
    '  status          Displays the stats of a managed server',
    '  config          Displays the psm configuration, or imports a config json file',
    //    '  attach           Attaches to SERVER console',
    '',
    'Options:',
    '  -h, --help      Displays this help message',
    '  -s, --silent    Silences all output from the cli',
    '  -v, --verbose   Enables verbose output from the cli',
    '  -d, --debug     Enables debug output from the cli',
    '  --version       Displays the version of the psm module',
    '',
    'Examples:',
    '  add remote managed psm module, note that you only have to specify the',
    '  port if it has been changed from the default 8596. Even with non default',
    '  ports you will not have to specify it again later, only when adding:',
    '    > psm remote add http://my.remote.server.com:666',
    '',
    '  restart local minecraft server:',
    '    > psm restart minecraft',
    '',
    '  restart remote minecraft server, note that the remote has to have been',
    '  added as a managed remote already with `psm remote add`:',
    '    > psm restart minecraft@my.remote.server.com',
    '',
    '  import a json config for a new server to manage (local only):',
    '    > psm import server.json',
    //    '  open a console to a remote managed server:',
    //    '    > psm attach minecraft@my.remote.server.com',
    //    '',
    ''
];

flatiron.app.use(flatiron.plugins.cli, {
    argv: argvOpts,
    usage: help
});

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

    psm.log.silly('Got start command for server: %s, at remote: %s', server, remote);

    psm.log.info('Starting server %s', server);
    psm.manager.cmd('start', server, remote, function(err, res) {
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

app.cmd(/stop ([^@]+)(@.+)?/, cli.stopServer = function() {
    var args = app.argv._[1].match(/([^@]+)(@.+)?/),
    server, remote;

    if(args !== null) {
        server = args[1];
        remote = (args[2] ? args[2].replace('@', '') : null);
    }

    psm.log.silly('Got stop command for server: %s, at remote: %s', server, remote);

    psm.log.info('Stopping server %s', server);
    psm.manager.cmd('stop', server, remote, function(err, res) {
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

app.cmd(/restart ([^@]+)(@.+)?/, cli.restartServer = function() {
    var args = app.argv._[1].match(/([^@]+)(@.+)?/),
    server, remote;

    if(args !== null) {
        server = args[1];
        remote = (args[2] ? args[2].replace('@', '') : null);
    }

    psm.log.silly('Got restart command for server: %s, at remote: %s', server, remote);

    psm.log.info('Restarting server %s', server);
    psm.manager.cmd('restart', server, remote, function(err, res) {
        if(err) {
            psm.log.error(err, 'Unable to restart server.', function() {
                process.exit(1);
            });
        } else {
            psm.log.info('Server has restarted.', function() {
                process.exit(0)
            });
        }
    });
});

app.cmd(/status ([^@]+)(@.+)?/, cli.showServerInfo = function() {
    var args = app.argv._[1].match(/([^@]+)(@.+)?/),
    server, remote;

    if(args !== null) {
        server = args[1];
        remote = (args[2] ? args[2].replace('@', '') : null);
    }

    psm.log.silly('Got status command for server: %s, at remote: %s', server, remote);

    psm.log.info('Getting status of server %s', server);
    psm.manager.cmd('status', server, remote, function(err, res) {
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

app.cmd(/list ?(.+)?/, cli.list = function() {
    var remote = app.argv._[1];

    psm.log.silly('Got list command for remote: %s', remote);

    psm.manager.cmd('list', remote, function(err, res) {
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


    psm.log.silly('Got remote %s command for remote: %s', cmd, remote);

    psm.manager.cmd(cmd, 'remote', remote, function(err, res) {
        if(err) {
            psm.log.error(err, 'Unable to get server list', function() {
                process.exit(1);
            });
        } else {
            psm.log.info('Remote manager ' + cmd + ' command completed successfully.', function() {
                process.exit(0);
            });
        }
    });
});

app.cmd(/(add|rm) server (.+)?/, cli.importServers = function() {
    var cmd = app.argv_[0],
    file = app.argv._[2] || null;

    psm.log.silly('Got %s command%s', cmd, (file ? ', with arg: ' + file : '.'));

    //open file, parse out server obj, parse out remote hostname
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
                    psm.log.info('New server added to local manager.', function() {
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
                    psm.log.info('New server added to local manager.', function() {
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
                psm.log.info('New server added to local manager.', function() {
                    process.exit(0);
                });
            }
        });
    }
});

app.cmd('config', cli.config = function() {
    psm.log.silly('Got config command.');

    psm.log.info('Current Configuration:\n%s', inspect(psm.config).cyan, function() {
        process.exit(0);
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

        app.start();
    });
};