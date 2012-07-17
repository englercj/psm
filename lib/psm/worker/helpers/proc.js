var cp = require('child_process'),
util = require('util'),
path = require('path'),
events = require('events');

var ProcManager = exports.ProcManager = function(options) {
    var self = this;
    events.EventEmitter.call(self);
    options = options || {};

    self.log = options.logger;
    self.worker = options.worker;
    self.server = options.server;

    self.outputs = options.worker.outputs;
    //this is dirty, but hey, they need a ref to eachother...
    self.outputs.proc = self;

    self._server = null;
    self._starting = false;
    self._stopping = false;
    self._idle = null;
    self._isIdle = false;

    self._cmd = 'java';
    self._args = [
        '-Xmx' + options.server.startup.maxMem,
        '-Xms' + options.server.startup.initMem,
        '-XX:ParallelGCThreads=' + options.server.startup.cpus
    ];
    if(options.server.startup.extraArgs)
	self._args = self._args.concat(options.server.startup.extraArgs);

    self._args = self._args.concat([
        '-jar',
        path.join(options.server.paths.bin, options.server.startup.jar),
        'nogui'
    ]);
    self._cwd = options.server.paths.bin;

    self._defineGetters();
    self._defineSetters();
};

util.inherits(ProcManager, events.EventEmitter);

ProcManager.prototype.start = function(cb) {
    var self = this;

    function startupDone() {
        self.outputs.removeListener('startup::done', startupDone);
        self.outputs.removeListener('startup::fail', startupFail);
        self.removeListener('startup::fail', startupFail);
        self.removeListener('shutdown::done', startupFail);

        self._starting = false;
        if(cb) cb(null, self._server);
    }

    function startupFail(err) {
        self.outputs.removeListener('startup::done', startupDone);
        self.outputs.removeListener('startup::fail', startupFail);
        self.removeListener('startup::fail', startupFail);
        self.removeListener('shutdown::done', startupFail);

        self._starting = false;

        if(!(err instanceof Error))
            err = new Error('Process exited with code ' + err + ' while starting');

        if(cb) cb(err);
    }

    if(self.running) {
        self.log.debug('Attempted to start while already running');
        if(cb) cb(new Error('Server is already running'));
    } else {
        self.log.info('Server is starting up...');

        //spawn service
        self.log.debug(self._args, 'spawning server with cmd: %s, cwd: %s', self._cmd, self._cwd);
        self._server = cp.spawn(self._cmd, self._args, { cwd: self._cwd });

        self.outputs.stream = self._server.stderr;

        //start idle check
        self.resetIdle();
        self._starting = true;

        //emit startup event
        self.emit('startup::start');

        //register events
        self._server.on('exit', function(code) {
            self.log.silly('Server process exited with code: %d', code);
            self.emit('shutdown::done', code);
        });

        self.outputs.on('startup::done', startupDone);
        self.outputs.on('startup::fail', startupFail);
        self.on('startup::fail', startupFail);
        self.on('shutdown::done', startupFail);
    }
};

ProcManager.prototype.stop = function(cb) {
    var self = this;

    function shutdownDone() {
        self.removeListener('shutdown::done', shutdownDone);
        self.removeListener('shutdown::fail', shutdownFail);

        self._stopping = false;
        self._server = null;
        if(cb) cb(null);
    }

    function shutdownFail(err) {
        self._stopping = false;

        psm.log.warn('Server went idle while shutting down, killing the process');
        self._server.kill();
    }

    if(!self.running) {
        self.log.debug('Attempted to stop while not running');
        if(cb) cb(new Error('Server is not running'));
    } else {
        self.log.info('Stopping server...');

        //send stop command to server
        self.input('stop\n');

        //reset idle check
        self.resetIdle();
        self._stopping = true;

        //setup events
        self.on('shutdown::done', shutdownDone);
        self.on('shutdown::fail', shutdownFail);
    }
};

ProcManager.prototype.input = function(str, cb) {
    var self = this;

    if(!self.running) if(cb) cb(new Error('Server is not running'));

    self._server.stdin.write(str);
    if(cb) cb(null);
};

ProcManager.prototype.resetIdle = function() {
    var self = this;

    if(self._idleTime) {
        clearTimeout(self._idle);
        self._isIdle = false;
        self._idle = setTimeout(function() {
            self._isIdle = true;
            self.emit('idle');

            //going idle while starting up or shutting down is a fail
            if(self._starting) self.emit('startup::fail', new Error('Server went idle while starting'));
            if(self._stopping) self.emit('shutdown::fail', new Error('Server went idle while stopping'));
        }, self._settings.idleTime);
    }
};

ProcManager.prototype._defineGetters = function() {
    var self = this;

    self.__defineGetter__('running', function() {
        return !!self._server;
    });

    self.__defineGetter__('starting', function() {
        return self._starting;
    });

    self.__defineGetter__('stopping', function() {
        return self._stopping;
    });

    self.__defineGetter__('idle', function() {
        return self._isIdle;
    });
};

ProcManager.prototype._defineSetters = function() {

};