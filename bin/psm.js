#!/usr/bin/env node

/**
 * Panther Server Manager bootstrap
 **/

//load required modules
var Cli = require('../lib/cli').Cli;
//api = require('../lib/api').Api;

var cli = new Cli();
cli.start();
//api.start();
