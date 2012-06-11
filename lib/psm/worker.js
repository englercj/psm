/**
 * worker.js: manages a single local gameserver instance
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

var psm = require('../psm'),
request = require('request'),
enode = require('enode'),
forever = require('forever');

var Worker = function() {

    self._serverId = process.argv[2];
    self._socketFile = process.argv[3];
    self._managerPort = process.argv[4];

    self._startServer(function() {
        self._notifyReady();
    });

    process.on('exit', function() {
        try {
            fs.unlinkSync(self._socketFile);
        } catch(e) {
            console.log(e);
        }
    });
};

Worker.prototype.start = function() {

};

Worker.prototype.stop = function() {

};

Worker.prototype.restart = function() {

};

Worker.prototype.status = function() {

};

Worker.prototype._notifyReady = function() {
    request('http://localhost:' + self._managerPort + '/workerReady/' + self._serverId, function(err, res, body) {
        if(!err && res.statusCode == 200) {
        } else {
            psm.log.error('Error trying to notify manager.', err);
        }
    });
};

Worker.prototype._startServer = function() {
    var self = this, f;

    psm.log.silly('Checking for existance of socket.');
    try { f = fs.lstatSync(self._socketFile); } catch(e) {}

    if(f) {
        //socket exists
        //TODO: Check pid file and see if this is already running, and if not
        //then we can remove socket and do it over again.
        psm.log.error('Socket already exists, unable to start worker enode server!');
        cb(new Error('Socket already exists, unable to start worker enode server!'));
        return;
    }

    psm.log.silly('Creating enode instance.');
    self._socket = new enode.Server({
        start: scopify(self, self.start),
        stop: scopify(self, self.stop),
        restart: scopify(self, self.restart),
        status: scopify(self, self.status)
    })
        .listen(self._socketFile)
        .on('error', function(err) {
            psm.log.error('Enode error!', err);
            cb(err);
        })
        .on('ready', function() {
            cb(null);
        });
};

function scopify(scope, fn) {
    return function() { fn.apply(scope, arguments); };
}