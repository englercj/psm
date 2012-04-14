#!/usr/bin/env node

/**
 * Panther Server Manager bootstrap
 * TODO:
 * - Check config/servers.json to ensure that each entry
 *   has atleast the minumum settings
 * - Check config/server.json to ensure there are no duplicate
 *   aliases for server-ids
 **/

//load required modules
var Cli = require('../lib/cli').Cli,
Api = require('../lib/api').Api,
Psm = require('../lib/psm').Psm,
servers = require('../config/servers.json');

//initialize PSM module and
//the CLI and API modules
var psm = new Psm(servers),
cli = new Cli(psm),
api = new Api(psm);

//start the CLI and API modules
cli.start();
api.start();