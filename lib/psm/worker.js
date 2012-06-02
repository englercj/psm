/**
 * worker.js: manages local gameserver instance
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var 
psm = require('../psm'),
enode = require('enode'),
forever = require('forever');

var Worker = function() {

    self._serverId = process.argv[2];
    self._socketFile = process.argv[3];

    process.on('exit', function() {
	try {
	    fs.unlinkSync(self._socketFile);
	} catch(e) {
	    console.log(e);
	}
    });
};