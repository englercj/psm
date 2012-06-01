// example.js

var flatiron = require('flatiron'),
app = flatiron.app;

app.use(flatiron.plugins.cli, {
    dir: __dirname,
    usage: [
	'This is a basic flatiron cli application example!',
	'',
    'hello - say hello to somebody.'
  ]
});

app.cmd('hello', function () {
    app.prompt.get('name', function (err, result) {
	app.log.info('hello '+result.name+'!');
    })
})

app.start();