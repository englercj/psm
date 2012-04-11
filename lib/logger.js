var fs = require('fs'),
path = require('path'),
colors = require('colors'),
config = require('../config/config.json');//JSON.parse(fs.readFileSync(path.join(__dirname, '../config/config.json')));

exports.log = function(msg, type, screen) {
    var threshold, error = false, head = '[';

    if(type === false) screen = false;

    switch(type) {
    case 'error':
        threshold = 0;
        head += 'ERROR'.red;
        error = true;
        break;
    case 'debug':
        threshold = 2;
        head += 'DEBUG'.green;
        break;
    case 'info':
        head += 'INFO'.cyan;
    default:
        threshold = 1;
        break;
    }

    if(type)
        head += '] ';
    else
        head = '';

    if(screen !== false) {
        if(typeof(msg) == 'string') {
            console.log(head + msg);
        } else {
            console.log(head);
            console.log(msg);
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
                        fs.write(fd, msg, null, 'utf8', function() { fs.close(fd); });
                    });
                }
            });
        }
    }
};