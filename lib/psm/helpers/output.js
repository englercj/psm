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

OutputParser.prototype.findPlayer = function(name) {
    var i = this._findPlayerIndex(name);

    return (i > -1 ? this._players[i] : null);
};

OutputParser.prototype.removePlayer = function(name) {
    var self = this, i = self._findPlayerIndex(name);

    if(i > -1) {
        self._players.splice(i, 1);
        return true;
    } else {
        return false;
    }
};

OutputParser.prototype._defineGetters = function() {
    var self = this;

    self.__defineGetter__('players', function() {
        return self._players;
    });

    self.__defineGetter__('mcversion', function() {
        return self._mcversion;
    });

    self.__defineGetter__('cbversion', function() {
        return self._cbversion;
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

    self.emit('output', strs);

    strs.forEach(function(str) {
        self._parsers.forEach(function(parser) {
            parser.call(self, str);
        });
    });
};

OutputParser.prototype._findPlayerIndex = function(name) {
    var self = this, indx = -1;

    for(var i = 0, len = self._players.length; i < len; ++i) {
        if(self._players[i].name == name) {
            indx = i;
            break;
        }
    }

    return indx;
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
                if(this._findPlayerIndex(parts[2]) === -1) {
                    this.log.debug('Player connected: %s', parts[2]);
                    this.emit('player::connect', parts[1], parts[2]);
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
                this.log.debug('Player disconnected: %s', parts[2]);
                this.emit('player::disconnect', parts[1], parts[2]);
                this.removePlayer(parts[2]);
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
                this.log.silly('Player %s chatted: %s', parts[2], parts[3]);
                this.emit('player::chat', parts[1], parts[2], parts[3]);
            }
        },
        function(str) {
            //server startup
            var parts = str.match(/^([0-9\-: ]+) \[INFO\] Done \(([0-9\.s]+)\)!/);

            if(parts) {
                //0 = entire message,
                //1 = timestamp,
                //2 = startup time
                this.log.info('Server has started up (' + parts[2] + ')');
                this.emit('startup::done', parts[1]);
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
                if(parts[2] == 'WARNING' && parts[3] == '**** FAILED TO BIND TO PORT!') {
                    //we need to log the error and kill the server
                    this.log.error('Server unable to start: %s', parts[3]);
                    this.emit('startup::fail', new Error(parts[3]));
                } else if(parts[2] == 'WARNING') {
                    this.log.warn(parts[0]);
                    this.emit('mcwarn', parts[0]);
                } else {
                    this.log.error(parts[0]);
                    this.emit('mcerror', parts[0], parts[2]);
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
                this._mcversion = parts[2];
            }
        },
	function(str) {
	    //cb version string
	    var parts = str.match(/^([0-9\-: ]+) \[INFO\] This server is running CraftBukkit version git-Bukkit-([\d\.]+)(-R\d\.\d)?-b([\d]{4}).+$/);

	    if(parts) {
		//0 = entire message,
		//1 = timestamp,
		//2 = mc version,
		//3 = release version,
		//4 = build version
		this._cbversion = parts[4];
	    }
	}
    ];
};