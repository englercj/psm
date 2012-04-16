var fs = require('fs'),
path = require('path'),
util = require('util'),
events = require('events'),
colors = require('colors'),
config = require('../config/config.json');

var Logger = exports.Logger = function() {
    events.EventEmitter.call(this);
};

//inherits from event emmitter
util.inherits(Logger, events.EventEmitter);

//Log worker
Logger.prototype.log = function(msg, type, emit) {
    var threshold, error = false, head = '[';

    //set color theme
    colors.setTheme(config.colors);

    if(type === false) emit = false;

    switch(type) {
    case 'error':
        threshold = 0;
        head += 'ERROR'.error;
        error = true;
        break;
    case 'debug':
        threshold = 2;
        head += 'DEBUG'.debug;
        break;
    case 'info':
        head += 'INFO'.info;
    default:
        threshold = 1;
        break;
    }

    if(type)
        head += '] ';
    else
        head = '';

    if(emit !== false) {
	if(typeof(msg) == 'string') {
	    this.emit('log::msg', head + msg);
	} else {
	    this.emit('log::msg', head);
	    this.emit('log::msg', msg);
	}
    }

    if(config.logging.level >= threshold) {
        var d = new Date(),
        date = (d.getMonth() + 1) + '-' + d.getDate() + '-' + d.getFullYear(),
        time =  d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds(),
        fname = path.join(__dirname, '..', config.logging.dir, 'log_' + date + '.log');

        head += '(' + time + ') ';

        fs.open(fname, 'a', '0666', function(err, fd) {
            if(typeof(msg) == 'string') {
                fs.write(fd, (head + msg).stripColors + '\n', null, 'utf8', function() { fs.close(fd); });
            } else {
                fs.write(fd, head.stripColors, null, 'utf8', function() {
                    fs.write(fd, msg, null, 'utf8', function() { fs.close(fd); });
                });
            }
        });

        //if its an error, log it seperately
        if(error) {
	    fname = path.join(__dirname, '..', config.logging.dir, 'error_' + date + '.log');
            fs.open(fname, 'a', '0666', function(err, fd) {
                if(typeof(msg) == 'string') {
                    fs.write(fd, (head + msg).stripColors + '\n', null, 'utf8', function() { fs.close(fd); });
                } else {
                    fs.write(fd, head.stripColors, null, 'utf8', function() {
                        fs.write(fd, msg.stripColors, null, 'utf8', function() { fs.close(fd); });
                    });
                }
            });
        }
    }
};