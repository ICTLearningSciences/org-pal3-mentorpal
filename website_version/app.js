var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var cons = require('consolidate');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var fs = require('fs');
var app = express();
var apptwo = express();
var https = require('https');
var http = require('http');
// view engine setup
app.engine('html', cons.swig)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

if(process.argv[2] != "dev"){
	var options = {
	  key: fs.readFileSync('/etc/letsencrypt/live/mentorpal.org/privkey.pem'),
	  cert: fs.readFileSync('/etc/letsencrypt/live/mentorpal.org/fullchain.pem')
	};
	var servertwo = http.createServer(apptwo);
}
var server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
indexRouter.io.listen(server);
if(process.argv[2] == "dev"){
	server.listen(8000, function(){
		console.log('redirecting');
	});
} else {
	server.listen(443, function(){
	    console.log('Listening for http requests');
	});
	apptwo.get('*',function(req,res,next){
		res.redirect(['https://', req.get('Host'), req.url].join(''));
	});
}

module.exports = app;
