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
var Cli = require('../lib/cli').Cli;
//api = require('../lib/api').Api;

var cli = new Cli();
cli.start();
//api.start();
