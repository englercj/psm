var events = require('events'),
colors = require('colors'),
util = require('util');

var OutputParser = exports.OutputParser = function(options) {
    var self = this;
    events.EventEmitter.call(self);

    self.log = options.logger;

    self._players = [];
    self._version = '';
    self._parsers = self._getParsers();

    self._defineGetters();
    self._defineSetters();
};

util.inherits(OutputParser, events.EventEmitter);

OutputParser.prototype._defineGetters = function() {
    var self = this;

    self.__defineGetter__('players', function() {
	return self._players;
    });

    self.__defineGetter__('version', function() {
	return self._version;
    });
};

OutputParser.prototype._defineSetters = function() {
    var self = this;

    self.__defineSetter__('stream', function(strm) {
	if(self._outputWrap)
	    self._stream.removeListener('data', self._outputWrap);
	
	self._outputWrap = function() { self._parseOutput.apply(self, arguments); };

	strm.on('data', self._outputWrap);
	self._stream = strm;
    });
};

OutputParser.prototype._parseOutput = function(output) {
    var self = this,
    strs = output.toString().trim().split('\n');
    
    self.proc.resetIdle();

    strs.forEach(function(str) {
	self._parsers.forEach(function(parser) {
	    parser.call(self, str);
	});
    });
};

OutputParser.prototype._removePlayer = function(name) {
    var self = this, indx = -1;

    for(var i = 0, len = self._players.length; i < len; ++i) {
	if(player.name == name) {
	    indx = i;
	    break;
	}
    }

    if(indx > -1) {
        self._players.splice(indx, 1);
	return true;
    } else {
	return false;
    }
};

OutputParser.prototype._getParsers = function() {
    return [
        function(str) {
            //player connect
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] ([^\s]+) \[\/([\d\.:]+)\] logged in with entity id ([\d]+) at \((\[([^\s]+)\] )?([\d\.\-\, ]+)\)$/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = player name,
                //3 = IP:Port
                //4 = entity id
                //5 = [worldname]
                //6 = worldname
                //7 = location logged into
                var name = parts[2];

                if(this._players.indexOf(name) === -1) {
                    this.emit('player::connect', name);
                    this._players.push({
			connect: parts[1],
			name: parts[2],
			ip: parts[3],
			id: parts[4]
		    });
                }
            }
        },
        function(str) {
            //player disconnect
            var i, player,
            parts = str.match(/^([0-9\-: ]+) \[INFO\] ([^\s]+) lost connection: ([\w\. ]+)$/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = player name,
                //3 = reason
                this.emit('player::disconnect', parts[2]);
		this._removePlayer(parts[2]);
                this.log.debug('Player disconnected: ' + parts[2]);
            }
        },
        function(str) {
            //chat message
            str = str.stripColors;
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] <([^>]+)> (.*)$/);

            if(parts)  {
                //0 = entire msg,
                //1 = timestamp,
                //2 = player name,
                //3 = message
                this.log.debug('Player ' + parts[2] + ' chatted: ' + parts[3]);
                this.emit('player::chat', parts[2], parts[3]);
            }
        },
        function(str) {
            //server startup
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] Done \(([0-9\.s]+)\)!/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = startup time
                this.log.info(this._settings.name + ' has started up (' + parts[2] + ')');
                this.emit('startup::done');
            }
        },
        function(str) {
            //errors
            var parts = str.match(/^([0-9\-: ]+) \[(SEVERE|WARNING|FATAL)\] (.*)$/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = message type,
                //3 = message

                //I have NO IDEA why this is just a warning...
                if(scrn || (parts[2] == 'WARNING' && parts[3] == '**** FAILED TO BIND TO PORT!')) {
                    //we need to log the error and kill the server
                    this.log.error(this._settings.name + ' unable to start: ' + parts[3]);
		    this.emit('startup::fail', new Error(parts[3]));
                } else {
                    this.log.error(this._settings.name + ' Error: ' + parts[0]);
		    this.emit('error', parts[0]);
                }
            }
        },
        function(str) {
            //log when generating map
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] Preparing (level|spawn area:) ([\w\"\d%]+)$/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = level OR spawn area:
                //3 = "world_name" OR #%
                this.log.info(parts[0].replace(parts[1] + ' [INFO] ', ''));
		if(parts[2] == 'level') {
		    this.emit('map::prepare', { world: parts[3] });
		} else {
		    this.emit('map::progress', { progress: parts[3] });
		}
            }
        },
        function(str) {
            //version string
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] Starting minecraft server version ([\d\.]+)$/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = version
                this._version = parts[2];
            }
        }
    ];
};